package com.yonder.app.trip.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CheckDto(@NotBlank String id, @NotBlank @Size(max = 120) String text, boolean done) {
}
