const express = require('express');
const path = require('node:path');
const { initialize } = require('./src/store');
const routes = require('./src/routes');

const app = express();
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', routes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large. The maximum upload size is 2 MB.' });
  }
  if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Upload one file using the "file" field.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

if (require.main === module) {
  initialize().then(() => {
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => console.log(`Docshare listening on port ${port}`));
  }).catch((error) => {
    console.error('Could not initialize document storage.', error);
    process.exitCode = 1;
  });
}

module.exports = app;
