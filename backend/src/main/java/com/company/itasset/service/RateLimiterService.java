package com.company.itasset.service;



import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    // Tracks request counts per user, resets every minute.
    // Note: in-memory only works for a single server instance.
    // In production with multiple instances, use Redis instead so all
    // instances share the same counter.
    private final Map<String, RequestCounter> userRequests = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 10;

    public boolean isAllowed(String userId) {
        RequestCounter counter = userRequests.computeIfAbsent(userId, k -> new RequestCounter());

        synchronized (counter) {
            long now = System.currentTimeMillis();
            if (now - counter.windowStart > 60_000) {
                counter.windowStart = now;
                counter.count = 0;
            }

            if (counter.count >= MAX_REQUESTS_PER_MINUTE) {
                return false;
            }

            counter.count++;
            return true;
        }
    }

    private static class RequestCounter {
        long windowStart = System.currentTimeMillis();
        int count = 0;
    }
}
