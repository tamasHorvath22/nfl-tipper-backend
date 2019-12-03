const fs = require('fs');

module.exports = function(templatePath, data) {
    let onelinerTemplate = _getTempalteAsOneLiner(templatePath)
    const keys = Object.keys(data);
    keys.forEach(key => {
        while (onelinerTemplate.includes(key)) {
            onelinerTemplate = onelinerTemplate.replace(key, data[key]);
        }
    })
    return _removeBrackets(onelinerTemplate);
};

function _getTempalteAsOneLiner(templatePath) {
    const fileUrl = new URL(_getBasePath(templatePath));
    const rawFile = fs.readFileSync(fileUrl, 'utf8').toString();
    let result = rawFile.replace(/(\r\n|\n|\r)/gm, ""); //removes break lines
    while (result.includes('    ')) {
        result = result.replace('    ', '');
    }
    return result;
}

function _getBasePath(filePath) {
    const fileBase = 'file:///' + __dirname.replace(/\\/g, '/').slice(0, -7);
    return fileBase + filePath;
}

function _removeBrackets(template) {
    const brackets = ['{{ ', ' }}'];
    brackets.forEach(bracket => {
        while (template.includes(bracket)) {
            template = template.replace(bracket, '');
        }
    });
    return template;
}
