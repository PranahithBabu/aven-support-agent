require('dotenv').config();
const fs = require('fs');
const Exa = require('exa-js').default;

const EXA_API_KEY = process.env.EXA_API_KEY;
const exa = new Exa(EXA_API_KEY);

(async () => {
  const result = await exa.getContents(
    ["aven.com/support"],
    {
      text: true,
      subpages: 20,
      subpageTarget: "faq, help, support"
    }
  );
  fs.writeFileSync('exa_aven_support_contents.json', JSON.stringify(result, null, 2));
  console.log('Saved Exa contents to exa_aven_support_contents.json');
})(); 