package com.yonder.app.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import com.yonder.app.auth.repository.UserRepository;
import com.yonder.app.trip.service.TripService;

@SpringBootTest
@ActiveProfiles({"test", "dev"})
class DemoDataSeederTests {
    @Autowired
    private UserRepository users;

    @Autowired
    private TripService trips;

    @Test
    void devProfileAddsAnIdempotentFictionalDemoAccountAndTrip() {
        var user = users.findByEmailIgnoreCase("demo@yonder.local").orElseThrow();
        assertNotNull(user.getPasswordHash());
        assertFalse(user.getPasswordHash().equals("YonderDemo2026!"));
        var demoTrips = trips.list("demo@yonder.local");
        assertEquals(1, demoTrips.size());
        assertEquals("Baguio Sample Weekend", demoTrips.get(0).name());
    }
}
