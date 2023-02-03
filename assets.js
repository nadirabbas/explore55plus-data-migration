const client = require("./client");
const {
  areas,
  communities,
  posts,
  postHtmlAssets,
  communityHtmlAssets,
} = require("./data");
const _ = require("lodash");
const fetch = require("node-fetch-commonjs");
const fs = require("fs");
const path = require("path");

const assetLinks = _.chain([
  areas.map((a) => a.images),
  communities.map((c) => [
    c.amenityImages.map((i) => i.image),
    c.financialImage1,
    c.financialImage2,
    c.imageGallery,
  ]),
  postHtmlAssets,
  posts.map((p) => p.heroImage),
  communityHtmlAssets,
])
  .flattenDeep()
  .filter()
  .uniq()
  .value();

const uploaded = {};

assetLinks.forEach((link) => {
  fetch(link)
    .then((res) => res.buffer())
    .then((buffer) => client.assets.upload("image", buffer))
    .then((assetDocument) => {
      uploaded[link] = assetDocument._id;
      fs.writeFile(
        path.resolve(__dirname, "asset-map.json"),
        JSON.stringify(uploaded, null, 2),
        (err) => err && console.log("error writing", err)
      );
    })
    .catch((err) => console.log("error uploading", err));
});
