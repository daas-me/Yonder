package com.yonder.app.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class JdbcSessionPersistenceTests {
    @Autowired
    private JdbcIndexedSessionRepository sessions;

    @Test
    void persistsSessionsInTheDatabase() {
        assertSessionPersistence(sessions);
    }

    private static <S extends Session> void assertSessionPersistence(SessionRepository<S> sessions) {
        S session = sessions.createSession();
        session.setAttribute("persistence-check", "stored");
        sessions.save(session);

        S restored = sessions.findById(session.getId());
        assertNotNull(restored);
        assertEquals("stored", restored.getAttribute("persistence-check"));

        sessions.deleteById(session.getId());
    }
}
