package com.company.itasset.dto.response;



public class ChatbotResponse {
    private String answer;

    public ChatbotResponse(String answer) {
        this.answer = answer;
    }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }
}