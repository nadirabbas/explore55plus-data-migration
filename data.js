const { htmlToBlocks } = require("@sanity/block-tools");
const Schema = require("@sanity/schema");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
global.DOMParser = new JSDOM().window.DOMParser;
const _ = require("lodash");
const assets = require("./asset-map.json");

const defaultSchema = Schema.compile({
  name: "myBlog",
  types: [
    {
      type: "object",
      name: "blogPost",
      fields: [
        {
          title: "Title",
          type: "string",
          name: "title",
        },
        {
          title: "Body",
          name: "body",
          type: "array",
          of: [
            {
              type: "block",
            },
            { type: "image" },
          ],
        },
      ],
    },
  ],
});

const blockContentType = defaultSchema
  .get("blogPost")
  .fields.find((field) => field.name === "body").type;

const getAsset = (src) => ({
  _type: "reference",
  _ref: assets[src],
});

const parseHtml = (html) =>
  htmlToBlocks(html || "", blockContentType, {
    rules: [
      {
        deserialize(el, next, block) {
          if (el.tagName !== "IMG") return undefined;

          return block({
            _type: "image",
            asset: getAsset(el.getAttribute("src")),
          });
        },
      },
    ],
  });

const tables = require("./dump.json").filter(({ type }) => type === "table");

const getTable = (name) => tables.find(({ name: n }) => n === name)?.data;
const getPostsByType = (type) =>
  getTable("wp_mw19wgmlld_posts").filter(
    ({ post_type, post_status }) =>
      post_type === type && post_status === "publish"
  );
const getPostById = (id) =>
  getTable("wp_mw19wgmlld_posts").find(({ ID }) => ID === id);
const getPostMetaByPostId = (postId, key = null) =>
  getTable("wp_mw19wgmlld_postmeta").find(
    ({ post_id, meta_key }) =>
      post_id === postId && (key ? meta_key === key : true)
  );

const slugify = (str) => ({
  _type: "slug",
  current: str,
});

const ref = (id, type) => ({ _type: "reference", _ref: id });
const refs = (ids, type, key) =>
  ids.map((id) => ({ ...ref(id, type), _key: key + id }));

const getPostMetaByMetaId = (id) =>
  getTable("wp_mw19wgmlld_postmeta").find(({ meta_id }) => meta_id === id);

const externalVideos = [];

const saveExternalVideo = (video, caption = null) => {
  const existingVideo = externalVideos.find(({ link }) => link === video);

  if (existingVideo) {
    return existingVideo._id;
  }

  const _id = "ev" + (externalVideos.length + 1);

  externalVideos.push({
    _id,
    _type: "externalVideo",
    link: video,
    caption,
  });

  return _id;
};

const states = [
  {
    _id: "s1",
    _type: "state",
    abbreviation: "FL",
    name: "Florida",
  },
];

const areas = getPostsByType("areas").map((area, i) => {
  return {
    _id: area.ID,
    _type: "area",
    name: area.post_title,
    slug: slugify(area.post_name),
    excerpt: "",
    overview: "",
    state: { _type: "reference", _ref: "s1" },
    images: [],
  };
});

const amenities = getPostsByType("activities").map((amenity, i) => {
  return {
    _id: "a" + amenity.ID,
    _type: "amenity",
    name: amenity.post_title.split(" ").slice(0, -1).join(" "),
    slug: slugify(amenity.post_name.split("-").slice(0, -1).join("-")),
  };
});

const funcs = (id) => [
  (key) => getPostMetaByPostId(id, key)?.meta_value,
  (oid) => areas.find(({ old_id }) => old_id == oid)?.id,
  (oid) => amenities.find(({ _id }) => _id == "a" + oid)?._id,
  (id) => getPostById(id)?.guid,
];

const communities = getPostsByType("community_finder").map((community) => {
  const [g, ga, gm, gi] = funcs(community.ID);

  const heroImageMetaId = g("hero");
  const yearBuilt = g("year_built");
  const yearCompleted = g("year_completed");
  const numberOfHomes = g("num_homes");
  const communityVideo = g("community_video");
  const closestMedical = g("medical_distance");
  const closestAirport = g("airport_distance");
  const closestGrocery = g("grocery_distance");
  const averageHomePrice = g("average_home_price");
  const lowestPriceSoldInTheLast6Months = g("low_sold_6mo");
  const highestPriceSoldInTheLast6Months = g("high_sold_6mo");
  const avgPerSqFt = g("avg_sqft");
  const hoaFees = g("hoa_fees");
  const cddFee = g("cdd_fee");
  const includedInFeesDescription = g("fees_description");
  const homePricingDetails = g("price_description");
  const annualPropertyTaxes = g("other_fees");

  const amenityCaption1 = g("amenity_caption_1");
  const amenityCaption2 = g("amenity_caption_2");
  const amenityCaption3 = g("amenity_caption_3");
  const amenityCaptions = [amenityCaption1, amenityCaption2, amenityCaption3];
  const isVideoType = g("video_images_toggle") == "1";

  const amenityVideo1 = g("amenity_video_1");
  const amenityVideo2 = g("amenity_video_2");
  const amenityVideo3 = g("amenity_video_3");
  const amenityVideos = [amenityVideo1, amenityVideo2, amenityVideo3]
    .filter((v) => v)
    .map((v, i) =>
      saveExternalVideo(v, isVideoType ? amenityCaptions[i] : null)
    );

  const amenityImage1 = g("amenity_image_1");
  const amenityImage2 = g("amenity_image_2");
  const amenityImage3 = g("amenity_image_3");
  const amenityImages = [amenityImage1, amenityImage2, amenityImage3]
    .filter((i) => i)
    .map((i, idx) => ({
      image: gi(i),
      caption: isVideoType ? null : amenityCaptions[idx],
    }));

  const imageGallery = [];
  for (let index = 0; index < 100; index++) {
    const imageId = g(`image_gallery_${index}_community_image`);
    if (!imageId) break;

    imageGallery.push(gi(imageId));
  }

  const faq = [];
  for (let index = 1; index < 100; index++) {
    const question = g(`faq_question_${index}`);
    if (!question) break;
    const answer = g(`faq_answer_${index}`);

    faq.push({
      _type: "faq",
      _key: `faq_${community.ID}_${index}`,
      question,
      answer,
    });
  }

  return {
    _id: "co" + community.ID,
    _type: "community",
    title: community.post_title,
    slug: slugify(community.post_name),
    showAdditionalDetails: !!g("communities_new_template") || false,
    heroImage: heroImageMetaId ? gi(heroImageMetaId) : null,
    description: parseHtml(g("community_description")),
    excerpt: g("community_excerpt"),
    state: ref("s1", "state"),
    hasNewBuilds: g("home_types") === "new_build",
    yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
    yearCompleted: yearCompleted ? parseInt(yearCompleted) : null,
    numberOfHomes: numberOfHomes ? parseInt(numberOfHomes) : null,
    externalVideo: communityVideo
      ? ref(saveExternalVideo(communityVideo), "externalVideo")
      : null,
    area: ref(ga(g("area").split('"')[1]), "area"),
    closestMedical: closestMedical ? parseInt(closestMedical) : null,
    closestAirport: closestAirport ? parseInt(closestAirport) : null,
    closestGrocery: closestGrocery ? parseInt(closestGrocery) : null,
    amenities: refs(
      g("community_activities")
        ?.match(/"(.*?)"/g)
        ?.map((i) => gm(parseInt(i.replaceAll('"', ""))))
        .filter((i) => i) || [],
      "amenity",
      "amc" + community.ID
    ),
    amenityImages,
    amenityVideos: refs(amenityVideos, "externalVideo", `amv${community.ID}`),
    financialImage1: gi(g("financial_image_1")),
    financialImage2: gi(g("financial_image_2")),
    averageHomePrice: averageHomePrice ? parseFloat(averageHomePrice) : null,
    lowestPriceSoldInTheLast6Months: lowestPriceSoldInTheLast6Months
      ? parseFloat(lowestPriceSoldInTheLast6Months)
      : null,
    highestPriceSoldInTheLast6Months: highestPriceSoldInTheLast6Months
      ? parseFloat(highestPriceSoldInTheLast6Months)
      : null,
    avgPerSqFt: avgPerSqFt ? parseFloat(avgPerSqFt) : null,
    hoaFees: hoaFees ? parseFloat(hoaFees) : null,
    cddFee: cddFee ? parseFloat(cddFee) : null,
    includedInFeesDescription,
    homePricingDetails,
    annualPropertyTaxes: annualPropertyTaxes
      ? parseFloat(annualPropertyTaxes)
      : null,
    gallerHeading: g("six_pack_heading"),
    gallerySupportingCopy: g("six_pack_copy"),
    imageGallery: {
      _type: "gallery",
      images: imageGallery.map((i, idx) => ({
        _key: `cog${community.ID}${idx}`,
        _type: "img",
        asset: getAsset(i),
      })),
    },
    faq,
  };
});

const categoryTax = getTable("wp_mw19wgmlld_term_taxonomy").filter(
  ({ taxonomy }) => taxonomy === "category"
);

const categoryTermIds = categoryTax.map(({ term_id }) => term_id);
const categoryTaxIds = categoryTax.map(
  ({ term_taxonomy_id }) => term_taxonomy_id
);

const categories = getTable("wp_mw19wgmlld_terms")
  .filter(({ term_id }) => categoryTermIds.includes(term_id))
  .map((category, i) => ({
    _id:
      "c" +
      categoryTax.find(({ term_id }) => term_id == category.term_id)
        ?.term_taxonomy_id,
    _type: "category",
    name: category.name,
    slug: slugify(category.slug),
    description: null,
  }));

const postCategoryRelationships = getTable(
  "wp_mw19wgmlld_term_relationships"
).filter(({ term_taxonomy_id }) => categoryTaxIds.includes(term_taxonomy_id));

const posts = getPostsByType("post").map((post) => {
  const [g, ga, gm, gi] = funcs(post.ID);
  const readTime = g("read_time");

  const gr = (id) =>
    postCategoryRelationships
      .filter((r) => r.object_id == id)
      .map(
        ({ term_taxonomy_id }) =>
          categories.find((c) => c._id == "c" + term_taxonomy_id)?._id
      )
      .filter((i) => i);

  return {
    _id: "p" + post.ID,
    _type: "post",
    title: post.post_title,
    slug: slugify(post.post_name),
    body: parseHtml(post.post_content),
    heroImage: gi(g("post_hero_image")),
    categories: refs(gr(post.ID), "category", "cp"),
    readingTime: readTime ? parseInt(readTime) : null,
    externalVideo: refs(
      [saveExternalVideo(g("external_url"))],
      "externalVideo",
      "evp"
    ),
  };
});

const postHtmlAssets = getTable("wp_mw19wgmlld_posts")
  .filter(({ ID }) => posts.find(({ _id }) => _id == "p" + ID))
  .filter((p) => p.post_content)
  .map((p) => p.post_content.match(/src="(.*?)"/g))
  .filter((arr) => arr && arr.length);

const communityHtmlAssets = getTable("wp_mw19wgmlld_posts")
  .filter(({ ID }) => communities.find(({ _id }) => _id == "co" + ID))
  .filter((p) => p.post_content)
  .map((p) => p.post_content.match(/src="(.*?)"/g))
  .filter((arr) => arr && arr.length);

module.exports = {
  states,
  areas,
  communities,
  amenities,
  categories,
  posts,
  externalVideos,
  postHtmlAssets,
  communityHtmlAssets,
  getAsset,
};
