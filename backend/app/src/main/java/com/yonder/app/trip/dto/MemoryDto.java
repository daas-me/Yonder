package com.yonder.app.trip.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MemoryDto(
        @NotBlank String id,
        @Pattern(regexp = "photo|note") String kind,
        @Size(max = 5000) String text,
        Instant at,
        Instant edited,
        @JsonProperty(access = JsonProperty.Access.READ_ONLY) String photoUrl) {
}
