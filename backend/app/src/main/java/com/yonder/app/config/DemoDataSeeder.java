package com.yonder.app.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.yonder.app.auth.dto.RegisterRequest;
import com.yonder.app.auth.repository.UserRepository;
import com.yonder.app.auth.service.UserService;
import com.yonder.app.trip.dto.ActivityDto;
import com.yonder.app.trip.dto.CheckDto;
import com.yonder.app.trip.dto.GeoDto;
import com.yonder.app.trip.dto.TripDto;
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
            LocalDate start = LocalDate.now().plusDays(30);
            LocalDate end = start.plusDays(2);
            ActivityDto activity = new ActivityDto(
                    "demo-activity-baguio-1", "sights", "Explore Burnham Park", start, LocalTime.of(9, 0),
                    "Burnham Park, Baguio", new BigDecimal("0.00"), null, null,
                    "Fictional sample itinerary item.", null, 16.4091, 120.5969, List.of());
            trips.create(EMAIL, new TripDto(
                    "demo-trip-baguio", null, "Baguio Sample Weekend", "Baguio City, Philippines",
                    start, end, "Fictional sample trip for local development.", new BigDecimal("5000.00"),
                    List.of(new CheckDto("demo-check-jacket", "Pack a light jacket", false)),
                    new GeoDto(16.4023, 120.5960), List.of(), List.of(), "#17675b", null,
                    "A sample trip, ready to edit.", List.of(activity)));
        };
    }
}
