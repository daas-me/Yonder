package com.yonder.app.trip.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TravelerDto(
        @NotBlank @Size(max = 40) String id,
        @Size(max = 80) String name) {
}
