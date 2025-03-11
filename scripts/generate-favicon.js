import favicons from 'favicons';
import fs from 'fs/promises';
import path from 'path';

const source = './src/assets/hippo.webp';
const configuration = {
  path: '/hippo',
  appName: 'Hippo',
  appShortName: 'Hippo',
  icons: {
    android: false,
    appleIcon: false,
    appleStartup: false,
    coast: false,
    favicons: true,
    firefox: false,
    windows: false,
    yandex: false
  }
};

(async () => {
  try {
    const response = await favicons(source, configuration);
    
    // Create public directory if it doesn't exist
    await fs.mkdir('./public', { recursive: true });
    
    // Save favicon files
    await Promise.all(response.images.map(async (image) => {
      await fs.writeFile(
        path.join('./public', image.name),
        image.contents
      );
    }));
    
    // Update HTML file with favicon links
    const htmlFile = './index.html';
    let htmlContent = await fs.readFile(htmlFile, 'utf8');
    
    // Insert favicon links after the title tag
    const faviconTags = response.html.join('\n    ');
    htmlContent = htmlContent.replace(
      '</title>',
      `</title>\n    ${faviconTags}`
    );
    
    await fs.writeFile(htmlFile, htmlContent);
    
    console.log('Favicon generated successfully!');
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
})();