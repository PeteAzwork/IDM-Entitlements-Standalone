let BASE_URL="http://idp-entitlements:8080"
let API_KEY="entitlementsRulez"

let headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY  
}
let method = "POST";

logger.info("Create Arrangement.js - object: " + JSON.stringify(object));

// Add the entity to the graph
let url = BASE_URL + '/admin/entities'

let req = {
    url,
    method,
    headers,
    body: JSON.stringify({
        "BaseType": 2,
        "attributes": object
    })
};
var res = openidm.action('external/rest', 'call', req);