package com.yonder.app.auth.dto;

import java.time.Instant;

public record UserDto(String id, String name, String email, String homeCity, Instant createdAt, String photoUrl) {
}
