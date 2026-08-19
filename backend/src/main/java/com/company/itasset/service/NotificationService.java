package com.company.itasset.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class NotificationService {

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userEmail) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 min timeout
        emitters.computeIfAbsent(userEmail, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(userEmail, emitter));
        emitter.onTimeout(() -> removeEmitter(userEmail, emitter));
        emitter.onError(e -> removeEmitter(userEmail, emitter));

        // Send connected event
        try {
            emitter.send(SseEmitter.event().name("connected").data("Connected to notifications"));
        } catch (IOException e) {
            removeEmitter(userEmail, emitter);
        }
        return emitter;
    }

    public void sendToUser(String userEmail, String type, String message) {
        List<SseEmitter> userEmitters = emitters.get(userEmail);
        if (userEmitters == null) return;
        userEmitters.removeIf(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(type)
                        .data(Map.of("type", type, "message", message, "timestamp", System.currentTimeMillis())));
                return false;
            } catch (IOException e) {
                return true;
            }
        });
    }

    public void broadcast(String type, String message) {
        emitters.forEach((email, list) -> sendToUser(email, type, message));
    }

    private void removeEmitter(String userEmail, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(userEmail);
        if (list != null) list.remove(emitter);
    }
}
