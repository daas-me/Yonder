package com.yonder.app.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 6, max = 72) String newPassword) {
}
