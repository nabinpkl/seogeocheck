package com.nabin.seogeo.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.Map;

@RestController
@Tag(name = "Health", description = "Health API")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Get the health status of the application")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
