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

// This is a workaround to make updating the entities easier - there's probably a better way to do this.
let entity = JSON.parse(JSON.stringify(object));
delete entity.RelatedCustomers;
delete entity.Arrangements;


let req = {
    url,
    method,
    headers,
    body: JSON.stringify({
        "BaseType": 4,
        "attributes": entity
    })
};
var res = openidm.action('external/rest', 'call', req);

let relatedCustomers = object.RelatedCustomers || [];

for(let i = 0; i < relatedCustomers.length; i++) {
    let relatedCustomer = openidm.read(relatedCustomers[i]._ref);

    let relatedCustomerReq = {
        url: BASE_URL + '/admin/entities/' + object.ID + '/relationships/',
        method: "POST",
        headers: headers,
        body: JSON.stringify({
            "sourceID": object.ID,
            "targetID": relatedCustomer.ID,
            "type": relatedCustomers[i]._refProperties.Type
        })
    };
    var relatedCustomerRes = openidm.action('external/rest', 'call', relatedCustomerReq);

}

let arrangements = object.Arrangements || [];

for(let i = 0; i < arrangements.length; i++) {
    let arrangement = openidm.read(arrangements[i]._ref);   

    let arrangementReq = {
        url: BASE_URL + '/admin/entities/' + object.ID + '/relationships/',
        method: "POST",
        headers: headers,
        body: JSON.stringify({
            "sourceID": object.ID,
            "targetID": arrangement.ID,
            "type": arrangements[i]._refProperties.Relationship
        })
    };
    var arrangementRes = openidm.action('external/rest', 'call', arrangementReq);
}

