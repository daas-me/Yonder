package com.yonder.app.places.service;

public class PlacesUnavailableException extends RuntimeException {
    public PlacesUnavailableException(String message) {
        super(message);
    }

    public PlacesUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
