package com.yonder.app.places.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class GooglePlacesConfiguration {
    @Bean
    RestClient googlePlacesRestClient() {
        return RestClient.create();
    }
}
