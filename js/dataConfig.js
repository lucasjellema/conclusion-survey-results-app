export const dataEndpoint = "https://odzno3g32mjesdrjipad23mbxq.apigateway.eu-amsterdam-1.oci.customer-oci.com/conclusion-proxy/speakerpool-data";
export const deltaEndpoint = "https://odzno3g32mjesdrjipad23mbxq.apigateway.eu-amsterdam-1.oci.customer-oci.com/conclusion-proxy/cloud-survey-results";

// this endpoint supports getting a list of all files in a specific bucket in a specific folder (e.g. /conclusion-assets/deltas/)
// it also allows uploading new files to the bucket to that specific folder
// the requests should contain the Authorization header with the ID token and the reques header Asset-Path; this header identifies the folder path (to get a list) or a specific object (to GET or PUT)
export const adminEndpoint = "https://odzno3g32mjesdrjipad23mbxq.apigateway.eu-amsterdam-1.oci.customer-oci.com/conclusion-admin-proxy/survey-admin";


export const surveySummaryEndpoint = "https://odzno3g32mjesdrjipad23mbxq.apigateway.eu-amsterdam-1.oci.customer-oci.com/conclusion-proxy/cloud-survey-total-result";
