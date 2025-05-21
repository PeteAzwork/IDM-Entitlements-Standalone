let BASE_URL="http://idp-entitlements:8080"
let API_KEY="entitlementsRulez"

let headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY  
}
let method = "PUT";

logger.info("Update Customer.js - object: " + JSON.stringify(object));

// Add the entity to the graph
let url = BASE_URL + '/admin/entities/' + object.ID
let fullObject = JSON.stringify(object)

let req = {
    url,
    method,
    headers,
    body: JSON.stringify({
        "ID": object.ID,
        "BaseType": 4,
        "attributes": {
            "name": JSON.stringify(object)
        }
    })
};
var res = openidm.action('external/rest', 'call', req);