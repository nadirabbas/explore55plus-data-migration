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
  postHtmlAssets,
  areas.map((a) => a.images),
  communities.map((c) => [
    c.amenityImages.map((i) => i.image),
    c.financialImage1,
    c.financialImage2,
    c.imageGallery,
  ]),
  posts.map((p) => p.heroImage),
  communityHtmlAssets,
])
  .flattenDeep()
  .filter()
  .uniq()
  .value()
  .map((link) =>
    link.startsWith("src") ? link.replace(/src="|"/g, "") : link
  );

const uploaded = {};

assetLinks.forEach(async (link) => {
  try {
    const buffer = await fetch(link).then((res) => res.buffer());
    const assetDocument = await client.assets.upload("image", buffer);

    uploaded[link] = assetDocument._id;
    fs.writeFile(
      path.resolve(__dirname, "asset-map.json"),
      JSON.stringify(uploaded, null, 2),
      (err) => err && console.log("error writing", err)
    );
  } catch (err) {
    console.log(err);
  }
});
