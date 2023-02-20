require("dotenv").config();
const sanityClient = require("@sanity/client");
const client = sanityClient({
  projectId: "giea6acr",
  dataset: process.env.SANITY_DATASET || "staging",
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

module.exports = client;
