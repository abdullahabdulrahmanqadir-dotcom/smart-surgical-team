// Papers listed on the old ssthyroid.com /publication page that are the team's
// own work but were absent from `researches`. Idempotent — rerunning updates.
//
// The old page held 30 entries; 15 were already here, and 12 of the rest are by
// other groups entirely (Sadq Ghaleb Kadem's group in Basra, and the Kuwait
// Cancer Control Center group) — verified through CrossRef and Europe PMC, with
// no team member on any author list. Those are deliberately not imported.
//
// Metadata below is CrossRef's / Europe PMC's, not the old page's: the old page
// had the wrong publication date for both Barw papers and a semicolon where the
// published title has a colon.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const papers = [
  {
    title: "Comparative Analysis of ChatGPT and Human Decision-Making in Thyroid and Neck Swellings: A Case-Based Study",
    authors:
      "Zardasht Mahmud Ahamed, Hardi Mohammed Dhahir, Miran Mawlood Mohammed, Rebaz Haji Ali, Shko H. Hassan, Aso S. Muhialdeen, Yadgar Abdulhameed Saeed, Mariwan L. Fatah, Aras J. Qaradakhy, Rawa M. Ali, Shaho F. Ahmed, Ari M. Abdullah, Hawbash M. Rahim, Berun A. Abdalla, Abdulwahid M. Salih, Shvan H. Mohammed, Fahmi H. Kakamad",
    abstract:
      "This study aimed to evaluate the performance of Chat Generative Pre-Trained Transformer (ChatGPT), an AI-powered chatbot, in providing treatment recommendations for head and neck nodules. Ten diverse cases were examined, including individuals with varying ages and conditions such as thyroid nodules and suspicious neck lesions. The decisions made by ChatGPT were compared to those of physicians. Data were collected from the Smart Health Tower on May 2, 2023. Analysis of the cases revealed that ChatGPT provided recommendations that aligned with physicians' decisions in seven cases, while disparities were observed in three. The findings suggest that ChatGPT can support clinical decision-making for thyroid and neck swellings, but that its recommendations still require physician oversight.",
    journal: "Barw Medical Journal",
    link: "https://doi.org/10.58742/bmj.v1i2.43",
    published_date: "2023-10-24",
    topic: "thyroid",
    subtopic: "thyroid-surgery",
  },
];

const { data: topics, error: topicError } = await supabase.from("research_topics").select("id,slug");
if (topicError) throw topicError;
const idFor = (slug) => {
  const t = topics.find((x) => x.slug === slug);
  if (!t) throw new Error(`research topic ${slug} does not exist`);
  return t.id;
};

for (const paper of papers) {
  const { topic, subtopic, ...rest } = paper;
  const payload = {
    ...rest,
    category: "Publication",
    status: "published",
    cover_image_url: null,
    topic_id: idFor(topic),
    subtopic_id: idFor(subtopic),
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase.from("researches").select("id").eq("title", paper.title).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("researches").update(payload).eq("id", existing.id);
    if (error) throw error;
    console.log("updated:", paper.title.slice(0, 70));
  } else {
    const { error } = await supabase.from("researches").insert(payload);
    if (error) throw error;
    console.log("added  :", paper.title.slice(0, 70));
  }
}
const { count } = await supabase.from("researches").select("id", { count: "exact", head: true });
console.log(`\nresearches now holds ${count} papers.`);
