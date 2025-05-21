/*
 * Copyright 2019-2020 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */

package bin.defaults.script

import static org.forgerock.openidm.util.ContextUtil.ADVICE_NAME_X_NOT_MODIFIED

import org.forgerock.json.JsonPointer
import org.forgerock.json.resource.AdviceContext
import org.forgerock.json.resource.PatchRequest
import org.forgerock.json.resource.UpdateRequest
import org.forgerock.openidm.filter.FilterVisitor
import org.forgerock.services.context.Context

class PropertiesModifiedFilter extends FilterVisitor {
    final List<JsonPointer> propertiesToCheck

    PropertiesModifiedFilter(List<String> propertiesToCheck) {
        this.propertiesToCheck = propertiesToCheck.collect{ JsonPointer.ptr(it) }
    }

    boolean checkNotModified(Context context) {
        if (context.containsContext(AdviceContext.class)) {
            def result = context.asContext(AdviceContext.class).getAdvices().get(ADVICE_NAME_X_NOT_MODIFIED);
            if (result && !result.empty && "true".equals(result[0])) {
                return true;
            }
        }
        return false;
    }

    @Override
    Boolean visitUpdateRequest(Context context, UpdateRequest request) {
        if (checkNotModified(context)) {
            return false;
        }
        return propertiesToCheck.stream()
                .anyMatch{ prop -> request.getContent().get(prop) != null }
    }

    @Override
    Boolean visitPatchRequest(Context context, PatchRequest request) {
        if (checkNotModified(context)) {
            return false;
        }
        return request.getPatchOperations().stream()
                .map{ op -> op.getField() }
                .anyMatch{ field -> propertiesToCheck.stream()
                    .anyMatch{ prop -> field.equals(prop) || field.isPrefixOf(prop) || prop.isPrefixOf(field) }}
    }
}

final propertiesList = propertiesToCheck as List<String>

final PropertiesModifiedFilter filter = new PropertiesModifiedFilter(propertiesList)
return request.accept(filter, context)