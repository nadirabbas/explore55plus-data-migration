const sanityClient = require("@sanity/client");
require("dotenv").config();
const client = sanityClient({
  projectId: "giea6acr",
  dataset: "staging",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

module.exports = client;
