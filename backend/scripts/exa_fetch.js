const fs = require('fs');

const data = JSON.parse(fs.readFileSync('aven_support_faqs_cleaned.json', 'utf8'));
const rawText = data[0].answer;
const source = data[0].source;

const lines = rawText.split('\n');

const faqs = [];
let currentQ = null;
let currentA = [];

for (let line of lines) {
  line = line.trim();

  // Skip junk
  if (
    line === '' ||
    line.startsWith('![') ||
    line.toLowerCase().includes('show more') ||
    line.startsWith('#####') ||
    line.startsWith('##') ||
    line.startsWith('[') ||
    line.toLowerCase().includes('message us') ||
    line.toLowerCase().includes('schedule a callback')
  ) {
    continue;
  }

  // Treat any line starting with "- " as a new question
  if (line.startsWith('- ')) {
    // Save previous Q&A
    if (currentQ && currentA.length > 0) {
      faqs.push({
        question: currentQ,
        answer: currentA.join(' ').trim(),
        source
      });
    }
    // Start new Q
    currentQ = line.replace(/^- /, '').trim();
    currentA = [];
  } else if (currentQ) {
    currentA.push(line);
  }
}

// Add final Q&A
if (currentQ && currentA.length > 0) {
  faqs.push({
    question: currentQ,
    answer: currentA.join(' ').trim(),
    source
  });
}

fs.writeFileSync('aven_support_faqs_final_cleaned.json', JSON.stringify(faqs, null, 2));
console.log(`✅ Extracted ${faqs.length} Q&A pairs.`);
