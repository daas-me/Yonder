package com.yonder.app.trip.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.yonder.app.common.ResourceNotFoundException;

@Service
public class PhotoStorageService {
    private static final long MAX_BYTES = 8 * 1024 * 1024;
    private final Path directory;

    public PhotoStorageService(@Value("${yonder.storage.photos-directory:./data/photos}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Photo must be between 1 byte and 8 MB");
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < 3 || (bytes[0] & 0xff) != 0xff || (bytes[1] & 0xff) != 0xd8 || (bytes[2] & 0xff) != 0xff) {
                throw new IllegalArgumentException("Only JPEG photos are supported");
            }
            Files.createDirectories(directory);
            String key = UUID.randomUUID().toString();
            Files.write(directory.resolve(key + ".jpg"), bytes);
            return key;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store photo", exception);
        }
    }

    public byte[] read(String key) {
        if (key == null || !key.matches("[0-9a-fA-F-]{36}")) {
            throw new ResourceNotFoundException("Photo not found");
        }
        try {
            Path path = directory.resolve(key + ".jpg").normalize();
            if (!path.startsWith(directory) || !Files.isRegularFile(path)) {
                throw new ResourceNotFoundException("Photo not found");
            }
            return Files.readAllBytes(path);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read photo", exception);
        }
    }

    public void delete(String key) {
        if (key == null || !key.matches("[0-9a-fA-F-]{36}")) {
            return;
        }
        try {
            Files.deleteIfExists(directory.resolve(key + ".jpg").normalize());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not delete photo", exception);
        }
    }

    public boolean isPhotoKey(String value) {
        return value != null && value.matches("[0-9a-fA-F-]{36}");
    }
}
