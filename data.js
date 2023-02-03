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

const getPostMetaByMetaId = (id) =>
  getTable("wp_mw19wgmlld_postmeta").find(({ meta_id }) => meta_id === id);

const externalVideos = [];

const saveExternalVideo = (video, caption = null) => {
  const existingVideo = externalVideos.find(({ link }) => link === video);

  if (existingVideo) {
    return existingVideo.id;
  }

  const id = externalVideos.length + 1;

  externalVideos.push({
    id,
    link: video,
    caption,
  });

  return id;
};

const states = [
  {
    id: 1,
    abbreviation: "FL",
    name: "Florida",
  },
];

const areas = getPostsByType("areas").map((area, i) => {
  return {
    id: i + 1,
    name: area.post_title,
    slug: area.post_name,
    excerpt: "",
    overview: "",
    state: 1,
    images: [],
    old_id: area.ID,
  };
});

const amenities = getPostsByType("activities").map((amenity, i) => {
  return {
    id: i + 1,
    name: amenity.post_title.split(" ").slice(0, -1).join(" "),
    slug: amenity.post_name.split("-").slice(0, -1).join("-"),
    old_id: amenity.ID,
  };
});

const funcs = (id) => [
  (key) => getPostMetaByPostId(id, key)?.meta_value,
  (oid) => areas.find(({ old_id }) => old_id == oid)?.id,
  (oid) => amenities.find(({ old_id }) => old_id == oid)?.id,
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
      question,
      answer,
    });
  }

  return {
    title: community.post_title,
    slug: community.post_name,
    showAdditionalDetails: !!g("communities_new_template") || false,
    heroImage: heroImageMetaId ? gi(heroImageMetaId) : null,
    description: g("community_description"),
    excerpt: g("community_excerpt"),
    state: 1,
    hasNewBuilds: g("home_types") === "new_build",
    yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
    yearCompleted: yearCompleted ? parseInt(yearCompleted) : null,
    numberOfHomes: numberOfHomes ? parseInt(numberOfHomes) : null,
    externalVideo: communityVideo ? saveExternalVideo(communityVideo) : null,
    area: ga(g("area").split('"')[1]),
    closestMedical: closestMedical ? parseInt(closestMedical) : null,
    closestAirport: closestAirport ? parseInt(closestAirport) : null,
    closestGrocery: closestGrocery ? parseInt(closestGrocery) : null,
    amenities:
      g("community_activities")
        ?.match(/"(.*?)"/g)
        ?.map((i) => gm(parseInt(i.replaceAll('"', ""))))
        .filter((i) => i) || [],
    amenityImages,
    amenityVideos,
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
    imageGallery,
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
    id: i + 1,
    name: category.name,
    slug: category.slug,
    parentCategory: null,
    description: null,
    taxId: categoryTax.find(({ term_id }) => term_id == category.term_id)
      ?.term_taxonomy_id,
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
          categories.find((c) => c.taxId == term_taxonomy_id)?.id
      )
      .filter((i) => i);

  return {
    title: post.post_title,
    slug: post.post_name,
    body: post.post_content,
    excerpt: post.post_excerpt,
    heroImage: gi(g("post_hero_image")),
    categories: gr(post.ID),
    readingTime: readTime ? parseInt(readTime) : null,
    externalVideo: saveExternalVideo(g("external_url")),
  };
});

module.exports = {
  states,
  areas,
  communities,
  amenities,
  categories,
  posts,
  externalVideos,
};
