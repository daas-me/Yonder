package com.yonder.app.places.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "yonder.google")
public record GooglePlacesProperties(String placesApiKey) {
}
