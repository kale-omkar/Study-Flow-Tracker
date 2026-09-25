const fs = require('fs');
const path = require('path');

const cssPath = path.resolve('src/App.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const lines = cssContent.split('\n');

const getLines = (start, end) => lines.slice(start - 1, end).join('\n') + '\n';

// 1. App.css (Global, Shell, Sidebar, Buttons, Utilities, Mobile)
const appCss = 
  getLines(1, 171) + // Shell, Sidebar, Main
  getLines(508, 651) + // Legacy global classes (view-header, stat-card, empty states)
  getLines(806, 842) + // Status, Progress
  getLines(1279, 1428) + // Buttons, Empty State
  getLines(1430, 1476); // Mobile

// 2. DashboardView.css
const dashboardCss = getLines(172, 507);

// 3. TopicsListView.css (Topics Grid)
const topicsListCss = getLines(653, 805);

// 4. TopicDetailView.css (Notes Block, Phase Timeline, Problem Filters)
// Wait, problem filters are also used in TopicDetailView? Actually, TopicDetailView uses ProblemCard.
const topicDetailCss = getLines(843, 931) + getLines(933, 966); // Problem Filters

// 5. ProblemCard.css (Problems & Details)
const problemCardCss = getLines(967, 1205);

// 6. Forms.css
const formsCss = getLines(1207, 1277);

// 7. ProblemsView.css (Problems View & Premium Redesign)
const problemsViewCss = getLines(1478, 2406);

// Write files
const writeCompCss = (name, content) => {
  fs.writeFileSync(path.resolve(`src/components/${name}.css`), content, 'utf8');
};

fs.writeFileSync(cssPath, appCss, 'utf8');
writeCompCss('DashboardView', dashboardCss);
writeCompCss('TopicsListView', topicsListCss);
writeCompCss('TopicDetailView', topicDetailCss);
writeCompCss('ProblemCard', problemCardCss);
writeCompCss('Forms', formsCss);
writeCompCss('ProblemsView', problemsViewCss);

console.log("CSS files split successfully.");

// Now update component files to import their CSS
const updateImports = (file, cssFile) => {
  const p = path.resolve(`src/components/${file}`);
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes(`import "./${cssFile}";`)) {
    content = content.replace(/import React(.*?);\n/, `import React$1;\nimport "./${cssFile}";\n`);
    fs.writeFileSync(p, content, 'utf8');
  }
};

updateImports('DashboardView.jsx', 'DashboardView.css');
updateImports('TopicsListView.jsx', 'TopicsListView.css');
updateImports('TopicDetailView.jsx', 'TopicDetailView.css');
updateImports('ProblemCard.jsx', 'ProblemCard.css');
updateImports('Forms.jsx', 'Forms.css');
updateImports('ProblemsView.jsx', 'ProblemsView.css');

console.log("Imports added successfully.");
