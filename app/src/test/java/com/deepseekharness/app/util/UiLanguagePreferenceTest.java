package com.deepseekharness.app.util;
import org.junit.Test;
import static org.junit.Assert.*;
public class UiLanguagePreferenceTest {
    @Test public void englishIsDefaultAndOnlyExplicitChineseSwitches() {
        for(String value:new String[]{null,"","system","fr","EN","zh-CN"})assertEquals("en",UiLanguagePreference.normalize(value));
        assertEquals("zh",UiLanguagePreference.normalize("zh"));assertTrue(UiLanguagePreference.supported("zh"));
        assertTrue(UiLanguagePreference.supported("en"));assertFalse(UiLanguagePreference.supported("fr"));
    }
    @Test public void runtimeTextSwitchesBothWays() {
        try{UiText.setLanguage("en");assertEquals("New",UiText.choose("新建","New"));
            UiText.setLanguage("zh");assertEquals("新建",UiText.choose("新建","New"));}
        finally{UiText.setLanguage("en");}
    }
}
