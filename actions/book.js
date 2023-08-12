import { gen, getPrompt, readData, writeData, extractJSON, outputDir, genImage, baseDir, search, fetch_url2, convertToDirectoryPath } from '../lib/functions.js';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import pkg from 'enquirer';
const { prompt } = pkg;
const BOOK_LANG = 'English'; 

class GenBook {
  async main() {
    await this.title(); // generate title
    await this.index(); // generate table of contents (chapters)
    await this.sections(); // generate table of contents (sections) 
    await this.write(); // write section content
    await this.make(); // generate mdbook project
    await this.addImage(); // generate cover image and section images
  }

  async help() {
    // generate help info based on main() call order
    console.log('');
    console.log('@title - generate book title');
    console.log('@index - generate table of contents (chapters)');
    console.log('@sections - generate table of contents (sections)');
    console.log('@write - write section content');
    console.log('@make - generate mdbook project'); 
    console.log('@addImage - generate cover image and section images');
    console.log('');
  }

  async title() {
    let bookData = readData();
    const info = await prompt({
      type: 'input', 
      name: 'desp',
      message: 'Please enter description',
      initial: 'Social networks and AI are enabling the rise of individuals. Especially for people with programming and media operation skills.', 
    });

    const title = getPrompt('gen_title', {
      "detail": info.desp,
      "language": BOOK_LANG, 
    });
    const result = await gen(title);
    if (result.json.title) {
      console.log('');
      const info2 = await prompt({
        type: 'input',
        name: 'title',
        message: `Please confirm book title`, 
        initial: result.json.title,
      });

      if (info2.title === '') {
        info2.title = result.json.title;
      }
      
      bookData.title = info2.title;
      bookData.desp = info.desp;
      bookData.coverDetail = result.json.cover_detail;
      writeData(bookData);
      console.log(`Book Title: 《${bookData.title}》`);
    } else {
      console.log('Failed to generate book title'); 
    }
  }

  async index() {
    // create table of contents
    let bookData = readData();
    const info = await prompt([
      {
        type: 'input',
        name: 'chapter_min',
        message: 'Please enter minimum number of chapters',
        initial: '5',  
      },
      {
        type: 'input', 
        name: 'chapter_important',
        message: 'Please enter number of important chapters',
        initial: '3',
      },
      {
        type: 'input',
        name: 'section_important_min',
        message: 'Please enter minimum sections in important chapters',
        initial: '3',
      },
      {
        type: 'input',
        name: 'section_min',
        message: 'Please enter minimum sections in normal chapters',
        initial: '2',
      },
    ]);
    bookData.chapterPref = info;
    console.log("Please wait, requesting...");
    const text = getPrompt('gen_index', {...bookData, ...info, "language": BOOK_LANG});
    const result = await gen(text);
    console.log("result", result);
    if (result.json.index) {
      console.log(result.json.index);
      bookData.index = result.json.index; 
      writeData(bookData);
    }
  }

  // generate sections based on chapters
  async sections() {
    const bookData = readData();
    const chapters = bookData.index.chapters;
    if (!chapters) {
      console.log("Please generate table of contents first");
      return; 
    }
    const chapterTitles = chapters.map((item, index) => {
      return `${index+1}. ${item.title}`; 
    }).join(" , ");
    // loop through chapters
    for (let i = 0; i < chapters.length; i++) {
      // check if sections already generated
      if (chapters[i].sections) {
        // skip
        continue;  
      } else {
        // confirm writing plan for this chapter
        const info = await prompt({
          type: 'input',
          name: 'howTo',
          message: `Please confirm writing plan for chapter 《${chapters[i].title}》`,
          initial: chapters[i].howTo,
        });
        
        
        const bookInfo = {
          title: bookData.title,
          desp: bookData.desp,
          chapter_title: chapters[i].title,
          chapter_howto: info.howTo || chapters[i].howTo,
          chapter_is_important: chapters[i].important ? " is " : " is not ",
          chapter_titles: chapterTitles,
          language: BOOK_LANG,
        }

        const text = getPrompt('gen_sections', {...bookInfo, ...bookData.chapterPref||{}});
        // console.log(text);
        console.log("Please wait, requesting...");
        const result = await gen(text);
        // console.log("result", result.json);
        if (result.json.sections) {
          chapters[i].sections = result.json.sections;
          writeData(bookData);
        }

        // test one chapter only 
        // break;

      }

      // wait 2 seconds
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
        }, 2000);
      });
    }
  }

  // write section content
  async write() {
    const bookData = readData();
    const chapters = bookData.index.chapters;
    if (!chapters) {
      console.log("Please generate table of contents first");
      return;
    }
    // loop chapters, then loop sections
    for (let i = 0; i < chapters.length; i++) {
      const sections = chapters[i].sections;
      if (!sections) {
        console.log("Please generate sections first");
        continue;  
      }
      for (let j = 0; j < sections.length; j++) {
        if (sections[j].content) {
          // skip
          continue;
        } else {
          const bookInfo = {
            title: bookData.title,
            desp: bookData.desp,
            toc: this.buildToc(),
            chapter_title: chapters[i].title,
            chapter_howto: chapters[i].howTo,
            chapter_is_important: chapters[i].important?"Yes":"No",
            section_title: sections[j].title,
            section_is_important: sections[j].important?"Yes":"No",
            language: BOOK_LANG,
          }

          let ref = "";
          // search web for reference
          if (process.env.SEARCH_DOMAIN && sections[j].queries && sections[j].queries.length > 0) {
            console.log("Please wait, searching...");
            const sites = process.env.SEARCH_DOMAIN == '*' ? false : process.env.SEARCH_DOMAIN.split("|");
            const results = await search(
              sections[j].queries.join(" "),  
              sites,
              false, // headless
              true // extend link
            );
            // console.log(results);
            if (results && results.length > 0) {
              ref = JSON.stringify(results);
            }
          } else {
            console.log(process.env.SEARCH_DOMAIN, sections[j].queries);
          }
          
          // 12000 chars as reference
          // ref = ref.substring(0, 12000);

          const text = getPrompt('gen_content', {...bookInfo, ...bookData.chapterPref||{}, ref});
          console.log(text);

          console.log("Please wait, requesting...");
          const result = await gen(text,  (message, char) => process.stdout.write(char), 'bba-content');
          // console.log("result", result.json);
          if (result.json['bba-content']) {
            sections[j].content = result.json['bba-content'];
            writeData(bookData);
          }

          
          // test one section only
          // break;

        }
        console.log(`Written ${i+1}/${chapters.length} chapters, ${j+1}/${sections.length} sections`);
        // wait 2 seconds
        console.log("Start writing next section in 5 secs, Ctrl+C to interrupt");
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve();  
          }, 5000);
        });
      }

      // break;
    }

    console.log("All section content written");
  }

  async addImage() {
    const bookData = readData();
    const bookDir = path.join(outputDir, convertToDirectoryPath(bookData.title));
    const imageDir = path.join(bookDir, 'src', 'images');
    // ensure directory exists
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, {recursive: true});
    }
    // read cover data
    if (bookData.coverDetail && !bookData.coverUrls) {
      console.log(`Generating cover image ${bookData.coverDetail}, please wait...`);
      // generate cover image
      const covers = await genImage(bookData.coverDetail);
      if (covers.artifacts) {
        // loop artifacts, save base64 images to imageDir
        for (let i = 0; i < covers.artifacts.length; i++) {
          const item = covers.artifacts[i];
          if (item.base64) {
            const filename = path.join(imageDir, `cover.${i}.png`);
            // save base64 data to file
            const buffer = Buffer.from(item.base64, 'base64');
            fs.writeFileSync(filename, buffer);

            bookData.coverUrls = bookData.coverUrls || [];
            bookData.coverUrls.push(`cover.${i}.png`);

            writeData(bookData);
          }
        }
      }
    }

    // loop chapters, then loop sections
    if (!bookData.index?.chapters) return false;
    const chapters = bookData.index.chapters;
    for (let i = 0; i < chapters.length; i++) {
      for (let j = 0; j < chapters[i].sections.length; j++) {
        const section = chapters[i].sections[j];
        if (section.cover_detail) {
          // generate image
          console.log(`Generating image ${section.cover_detail}, please wait...`);
          const images = await genImage(section.cover_detail);
          if (images.artifacts) {
            // loop artifacts, save base64 images to imageDir
            for (let k = 0; k < images.artifacts.length; k++) {
              const item = images.artifacts[k];
              if (item.base64) {
                const filename = path.join(imageDir, `chapter.${i+1}.section.${j+1}.image.${k+1}.png`);
                // save base64 data to file
                const buffer = Buffer.from(item.base64, 'base64');
                fs.writeFileSync(filename, buffer);

                section.images = section.images || [];
                section.images.push(`chapter.${i+1}.section.${j+1}.image.${k+1}.png`);

                writeData(bookData);
              }
            }  
          }
        }

        // wait 5 seconds
        console.log("Start generating next image in 5 secs, Ctrl+C to interrupt");
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve();
          }, 5000);
        });
      }
    }

  }

  buildToc() {
    // loop chapters, generate Table of Content  
    const bookData = readData();
    // console.log(bookData);
    const chapters = bookData.index.chapters;
    let toc = ``; // TOC is markdown string
    for (let i = 0; i < chapters.length; i++) {
      const sections = chapters[i].sections;
      if (!sections) {
        continue
      }
      toc += `## ${chapters[i].title}\n`;
      for (let j = 0; j < sections.length; j++) {
        toc += `### ${sections[j].title}\n`;
      }
    }
    // console.log(toc);
    return toc;
  }

  async test() {
    // console.log("Generating image, please wait...");
    // const ret = await genImage("A young woman using data analytics software and charts on multiple monitors to uncover insights and showing excitement as profits rapidly increase.");
    // console.log(ret);
    // const ret = await search( 'Number of fans, engagement, social platform', ['wikipedia.org'], false, true );
    // console.log(ret);
    // const ret = await fetch_url2("https://www.xdsyzzs.com/shangyeliutong/7031.html");
    // console.log(ret);
    const bookData = readData();
    console.log(convertToDirectoryPath(bookData.title));
  }

  async make() {
    const bookData = readData();
    // initialize mdbook project under book dir
    const bookDir = path.join(outputDir, convertToDirectoryPath(bookData.title));
    // ensure directory exists
    if (!fs.existsSync(bookDir)) {
      fs.mkdirSync(bookDir);
    }
    // initialize mdbook project
    const initCmd = `cd ${bookDir} && mdbook init --ignore git --title "${bookData.title}" --force`;
    // run command and output result
    // console.log(initCmd);
    console.log("Initializing mdbook project...");
    await new Promise((resolve, reject) => {
      exec(initCmd, (err, stdout, stderr) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        console.log(stdout);
        resolve();  
      });
    });

    const summaryPath = path.join(bookDir, 'src/SUMMARY.md');
    
    // loop chapters, generate mdbook SUMMARY.md
    let summary = `# Summary\n\n* [Cover](README.md)\n`;
    // generate homepage 
    const frontPath = path.join(bookDir, 'src/README.md');
    let frontContent = `# ${bookData.title}\n\n`;
    // if cover image exists, add it
    if (bookData.coverUrls) {
      frontContent += `![Cover](/images/${bookData.coverUrls[0]})\n\n`;
    }
    fs.writeFileSync(frontPath, frontContent);

    const chapters = bookData.index.chapters;
    for (let i = 0; i < chapters.length; i++) {
      const chapterDir = path.join(bookDir, 'src', convertToDirectoryPath(chapters[i].title));
      // ensure directory exists
      if (!fs.existsSync(chapterDir)) {
        fs.mkdirSync(chapterDir);
      }

      // create chapter README.md
      const chapterReadmePath = path.join(chapterDir, 'README.md');
      const chapterReadme = `# ${chapters[i].title}\n\n${chapters[i].desp||chapters[i].howTo|""}\n\n`;
      fs.writeFileSync(chapterReadmePath, chapterReadme);
      
      const sections = chapters[i].sections;
      if (!sections) {
        continue
      }  
      summary += `* [${chapters[i].title}](${convertToDirectoryPath(chapters[i].title)}/README.md)\n`;
      for (let j = 0; j < sections.length; j++) {
        summary += `    * [${sections[j].title}](${convertToDirectoryPath(chapters[i].title)}/${convertToDirectoryPath(sections[j].title)}.md)\n`;
        // write section content to file
        const sectionPath = path.join(chapterDir, `${convertToDirectoryPath(sections[j].title)}.md`);
        // console.log("sectionPath", sectionPath, sections[j]);

        const sectionCoverMarkdown = sections[j].images ? sections[j].images.map((url) => `![${sections[j].title}](/images/${url})`).join("\n\n")+"\n\n" : "";

        const sectionContent = String(sections[j].content.trim()).startsWith(`# ${sections[j].title}`) ? sections[j].content : `# ${sections[j].title}\n\n${sections[j].content}`;

        fs.writeFileSync(sectionPath, sectionCoverMarkdown+''+sectionContent);
        
      }
    }
    // console.log(summary);
    fs.writeFileSync(summaryPath, summary);
    console.log("summary generated");
  }


    async update() {
    // Modify section content
    // Input section title
    const bookData = readData();
    const sectionTitle = await prompt({
        type: 'input', 
        name: 'sectionTitle',
        message: 'Please input the section title'
    });

    // Search bookData to locate the section
    const chapters = bookData.index.chapters;
    let section = null;
    let chapter = null;

    for(let i = 0; i < chapters.length; i++) {
        const sections = chapters[i].sections;
        if(!sections) {
        continue;
        }
        
        for(let j = 0; j < sections.length; j++) {
        if(sections[j].title == sectionTitle.sectionTitle) {
            section = sections[j];
            chapter = chapters[i];
            break; 
        }
        }
    }
    
    if(!section) {
        console.log("Section not found");
        return;
    }
    
    // Input modification suggestions 
    const info = await prompt({
        type: 'input',
        name: 'howToFix',
        message: `Please provide suggestions for updating section '${section.title}'`
    });
    
    // Generate modification suggestions
    const bookInfo = {
        title: bookData.title,
        desp: bookData.desp,
        toc: this.buildToc(),
        chapterTitle: chapter.title, 
        chapterIsImportant: chapter.important ? " is " : " is not ",
        
        sectionTitle: section.title,
        sectionIsImportant: section.important ? " is " : " is not ",
        sectionContent: section.content,
        language: BOOK_LANG
    };
    
    const text = getPrompt('genUpdate', {...bookInfo, ...bookData.chapterPref || {}, howToFix: info.howToFix});

    const updatedContent = await gen(text, (message, char) => process.stdout.write(char), 'bba-content');

    // Confirm update to section
    const confirm = await prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Confirm update to section '${section.title}'?`,
        initial: true
    });
    
    if(confirm.confirm) {
        section.content = updatedContent.json['bba-content'];
        writeData(bookData);
        console.log(`Section '${section.title}' updated successfully`); 
    }
    }

    async translate() {
    // Input language to translate to
    const info = await prompt({
        type: 'input', 
        name: 'language',
        message: `Please input the language to translate to`,
        initial: 'english'
    });

    const bookData = readData();
    const chapters = bookData.index.chapters;
    
    if(!chapters) {
        console.log("Please generate table of contents first");
        return;
    }

    // Loop through chapters, then sections
    for(let i = 0; i < chapters.length; i++) {
        const sections = chapters[i].sections;
        
        if(!sections) {
        console.log("Please generate sections first");
        continue; 
        }
        
        for(let j = 0; j < sections.length; j++) {
        if(!sections[j].content || sections[j].language == info.language) {
            // Skip
            continue;  
        } else {
            const bookInfo = {
            title: bookData.title,
            desp: bookData.desp,
            toc: this.buildToc(),
            chapterTitle: chapters[i].title,
            chapterHowto: chapters[i].howTo,
            chapterIsImportant: chapters[i].important ? " is " : " is not ",
            sectionTitle: sections[j].title,
            sectionIsImportant: sections[j].important ? " is " : " is not ",
            language: BOOK_LANG,
            toLanguage: info.language
            };

            const text = getPrompt('genTranslation', {...bookInfo, ...bookData.chapterPref || {}});
            
            console.log(text);

            console.log("Please wait, initiating request...");
            const result = await gen(text, (message, char) => process.stdout.write(char), 'bba-content');
            
            if(result.json['bba-content']) {
            sections[j].content = result.json['bba-content'];
            sections[j].language = info.language;
            writeData(bookData);
            }

            // Test one is enough
            // break;
        }

        // Rest for 2 seconds  
        // Progress
        console.log(`Translated ${i+1}/${chapters.length} chapters, ${j+1}/${sections.length} sections`);

        console.log("Starting next section translation in 5 seconds, Ctrl+C to interrupt");
        await new Promise((resolve, reject) => {
            setTimeout(() => {
            resolve();
            }, 5000);
        });
        }

        // break;
    }

    console.log("Translation of all sections completed");
    }
}

export default new GenBook();
