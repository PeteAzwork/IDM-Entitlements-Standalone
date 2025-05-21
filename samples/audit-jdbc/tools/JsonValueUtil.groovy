/*
 * Copyright 2015-2017 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */


import static org.forgerock.json.JsonValue.json
import static org.forgerock.json.JsonValue.object

import org.forgerock.http.util.Json
import org.forgerock.json.JsonValue

public class JsonValueUtil {
    public static JsonValue fromEntries(Map.Entry<String,Object>[] entries) {
        JsonValue json = json(object());

        for (Map.Entry<String,Object> entry : entries) {
            if (entry.getKey() != null && entry.getValue() != null) {
                json.add(entry.getKey(), entry.getValue());
            }
        }

        return json;
    }

    public static JsonValue fromJsonString(String string) {
        return string != null && string.length() > 0 ? json(Json.readJson(string)) : null;
    }

    public static Boolean booleanFromString(String string) {
        try {
            return Boolean.valueOf(string);
        } catch (Exception e) {
            return Boolean.FALSE;
        }
    }
}
