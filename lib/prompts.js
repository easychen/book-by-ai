const prompts = {
    "gen_title": `
    Please answer in {{language}}.
    
    You are a world-class bestselling book publisher. Please suggest a title for this book based on the description, make it informative and compelling to read and purchase, around 10-30 characters, can be main title - subtitle, e.g. 《Demand - Opportunities and Hands-on Practice of Nurturing Niche Markets》
    
    Description: {{detail}}, please return your suggested title (no need for book quotes) and cover in JSON format. 
    
    The cover should match the specifics of the book, with concrete characters or objects, and describe the scene in **English**. This text will be provided to StableDiffusion to generate the image, please optimize accordingly. Use English for the cover description, keep other parts in {{language}}.
    
    Format is: \`{"title":"Your suggested title here","cover_detail":"Cover description"}\`
    `,
  
    "gen_index": `
    Please answer in {{language}}.
    
    You are a world-class bestselling book editor planning the table of contents for the next bestseller. The book is titled 《{{title}}》 with the blurb:「{{desp}}」.
  
    Please complete the TOC planning following these steps, do not omit any steps or outputs, follow strictly:
    
    1. Based on the title and blurb, plan a writing approach that can make this book a bestseller. Output the outline and explain the reasoning.
    2. Based on the writing approach, plan the chapters this book should contain. Requirements:
       1. No less than {{chapter_min}} chapters, with {{chapter_important}} as important chapters, others as ordinary.
       2. Clarify logic between chapters, each covering distinct contents without repetition, maintaining smooth flow. 
       3. Chapter titles should reflect specific contents, no lazy writing. If case studies, specify the exact case, no Case 1, Case 2.
       4. Determine title, writing approach, summary and highlights for each chapter, mark important chapters. Output chapter plans with reasoning.
    3. Based on the above, determine the final chapters. Return in JSON format, e.g.:\`{"index":{"chapters":[
       {
           "title":"Chapter 1",  
           "important":false,
           "howTo":"Writing approach",
           "desp":"Summary",
           "keyPoints":[
               "Highlight 1",
               "Highlight 2"
           ]
       },
       {
           "title":"Chapter 2",
           "important":true,
           "howTo":"Writing approach",
           "desp":"Summary",
           "keyPoints":[
               "Highlight 1",
               "Highlight 2"
           ]
       }
  
     ]}}\`
    `,
    
    "gen_sections":
    `
    Please answer in {{language}}.
    
    You are a world-class bestselling book editor planning the table of contents for the next bestseller. The book is titled 《{{title}}》 with the blurb:「{{desp}}」.
  
    You have completed chapter planning, chapter titles are: 「{{chapter_titles}}」. Current task is to plan the sections for {{chapter_title}}. Please complete following these steps, do not omit any steps or outputs, follow strictly:
  
    1. Based on chapter title 《{{chapter_title}}》 and writing approach「{{chapter_howto}}」, plan the sections it should contain. Requirements:
       1. Important chapters have at least {{section_important_min}} sections, ordinary chapters at least {{section_min}}. This chapter {{chapter_is_important}} important.
       2. Determine main content and title for each section, logic flow between sections. Output sections with reasoning.
       3. Determine search Query for each section, can be references or to-be-confirmed materials, max 3 Queries per section. Output Query arrays with reasoning.
       4. Determine cover image for each section. Describe a specific scene representing the section, with concrete characters or objects, and describe in words. This will be provided to StableDiffusion to generate the image, please optimize accordingly. Avoid overlapping with other sections. Output cover description in English with reasoning. Keep other parts in {{language}}.
       5. Determine if section is important. Output if important with reasoning.
    2. Based on the above, return the planned sections in JSON format, e.g. :\`{"sections":
       [
           {"title":"Section 1","queries":["keyword keyword keyword","keyword keyword"],"cover_detail":"Cover description","important":true},
           {"title":"Section 2","queries":["keyword keyword","keyword keyword keyword"],"cover_detail":"Cover description","important":false}
       ]
    }\`
    `,
    
    "gen_content":
    `
    Please answer in {{language}}.
  
    You are a world-class bestselling author writing the next bestseller. The book is titled 《{{title}}》 with the blurb:「{{desp}}」.
  
    The TOC is:
    \`\`\` 
    {{toc}}
    \`\`\`
  
    We have gathered references related to this section in JSON format:
    \`\`\`json
    {{ref}}
    \`\`\` for your reference.
  
    Please complete writing the content following these steps, do not omit any steps or outputs, follow strictly:
    1. Based on the TOC, this section is titled 《{{section_title}}》, part of chapter 《{{chapter_title}}》. Ensure content does not repeat other sections, flows smoothly. Determine the writing approach, output with reasoning.
    2. Important sections require at least 2000 words, this section  {{section_is_important}} important. Meet the word count. 
    3. Based on the writing approach, compose the content in Markdown format, use full-width commas \`,\`. Adopt a light and humorous style for pleasant reading, use examples and stories to explain points where possible. Use {{language}} for the content, wrap in <bba-content> tag, e.g.:
    \`\`\`markdown
    <bba-content>
    Content goes here, containing only the created content...
    </bba-content>
    \`\`\` The output should contain one <bba-content> tag and only one.
    `,
  
    "gen_update":
    `
    Please answer in {{language}}.
  
    You are a world-class bestselling author polishing the next bestseller. The book is titled 《{{title}}》 with the blurb:「{{desp}}」
  
    The TOC is:
    \`\`\`
    {{toc}}
    \`\`\`
  
    Current task is to polish section 《{{section_title}}》.
  
    The content is:
    \`\`\`
    {{section_content}}
    \`\`\`
    
    Please complete updating the content following these steps, do not omit any steps or outputs, follow strictly:
  
    1. Based on the TOC, this section is 《{{section_title}}》, part of chapter 《{{chapter_title}}》. Ensure content does not repeat other sections, flows smoothly. Based on feedback {{howto_fix}}, rewrite the section. Output with reasoning.
  
    2. Important sections require at least 2000 words, this section  {{section_is_important}} important. Meet the word count.
  
    3. Based on the feedback, polish the content in Markdown format, use full-width commas \`,\`, avoid individual English words in Chinese paragraphs (except special terms). Adopt a light and humorous style for pleasant reading, use examples and stories to explain points where possible.  
  
    Wrap the created content in <bba-content> tag, e.g.:
    \`\`\`markdown
    <bba-content>
    Content goes here, containing only the updated content...
    </bba-content>
    \`\`\` The output should contain one <bba-content> tag and only one.
    `,
  
    "gen_translation": `
    You are a world-class bestselling book translator working on the {{to_language}} translation. The book is titled 《{{title}}》 with the blurb:「{{desp}}」
  
    The TOC is:
    \`\`\`
    {{toc}} 
    \`\`\`
  
    Current task is to translate section 《{{section_title}}》.
    The content to translate is:
    \`\`\`
    {{section_content}}
    \`\`\`
  
    Please complete the translation following these steps, do not omit any steps or outputs, follow strictly:
    1. Based on the TOC, this section is 《{{section_title}}》, part of chapter 《{{chapter_title}}》. Pay attention to terminology during translation, consider the specific scenario described in this section.
    2. Strictly follow the original text for fluent translation and pleasant reading experience.
    3. Use {{to_language}} for the translation, wrap in <bba-content> tag, e.g.:
    \`\`\`markdown
    <bba-content>
    Translated content goes here, containing only the translation...
    </bba-content>
    \`\`\` The output should contain one <bba-content> tag and only one.
    `
  
  };
  
  export default prompts;