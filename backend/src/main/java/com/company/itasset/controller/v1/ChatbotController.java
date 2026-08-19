package com.company.itasset.controller.v1;



import com.company.itasset.dto.request.ChatbotRequest;
import com.company.itasset.dto.response.ChatbotResponse;
import com.company.itasset.service.ChatbotService;
import com.company.itasset.service.RateLimiterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chatbot")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @Autowired
    private RateLimiterService rateLimiterService;

    @PostMapping("/query")
    public ResponseEntity<?> query(@RequestBody ChatbotRequest request, Authentication authentication) {
        String userId = authentication.getName();

        if (!rateLimiterService.isAllowed(userId)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Too many requests. Please wait a moment.");
        }

        if (request.getQuestion() == null || request.getQuestion().isBlank()) {
            return ResponseEntity.badRequest().body("Question cannot be empty.");
        }

        String answer = chatbotService.processQuery(request.getQuestion());
        return ResponseEntity.ok(new ChatbotResponse(answer));
    }
}