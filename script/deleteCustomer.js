let BASE_URL="http://idp-entitlements:8080"
let API_KEY="entitlementsRulez"

let headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY  
}
let method = "DELETE";

logger.info("Update Customer.js - object: " + JSON.stringify(object));

// Add the entity to the graph
let url = BASE_URL + '/admin/entities/' + object.ID

let req = {
    url,
    method,
    headers
};
var res = openidm.action('external/rest', 'call', req);