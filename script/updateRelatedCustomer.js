let BASE_URL="http://idp-entitlements:8080"
let API_KEY="entitlementsRulez"

let headers = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY  
}
let method = "POST";

logger.info("Create Customer.js - object: " + JSON.stringify(object));

