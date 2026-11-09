package com.yonder.app.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.yonder.app.auth.dto.RegisterRequest;
import com.yonder.app.auth.repository.UserRepository;
import com.yonder.app.auth.service.UserService;
import com.yonder.app.trip.service.TripService;

@Configuration
@Profile("dev")
@ConditionalOnProperty(name = "yonder.demo-seed.enabled", havingValue = "true")
public class DemoDataSeeder {
    private static final String EMAIL = "demo@yonder.local";

    @Bean
    ApplicationRunner seedDemoData(UserRepository users, UserService userService, TripService trips) {
        return args -> {
            if (users.findByEmailIgnoreCase(EMAIL).isEmpty()) {
                userService.register(new RegisterRequest("Yonder Demo Traveler", EMAIL, "YonderDemo2026!"));
            }
            if (!trips.list(EMAIL).isEmpty()) {
                return;
            }
            trips.createStarterTrip(EMAIL);
        };
    }
}
