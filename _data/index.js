const fs = require('fs');
const csv = require('csv');
const yaml = require('yaml').default;

/*
DATA SOURCE: https://www.bls.gov/oes/current/oes_nat.htm#00-0000
DATA SOURCE XLS: https://www.bls.gov/oes/special.requests/oesm17nat.zip
*/

csv.parse(fs.readFileSync('_data/jobs.csv').toString(), function (err, data) {

    const t = new Array(data.length - 1);
    for (var i = 1; i < data.length; i++) {
        var e = t[i - 1] = {};
        for (var j = 0; j < data[0].length; j++) {
            e[data[0][j].toLowerCase().replace(/[^a-z]+/g, '_')] = data[i][j];
        }
    }
    data = t;

    let total = data[0];
    let major = null;
    let minor = null;
    let broad = null;
    let detail = null;

    data[0].parent = null;
    data[0].children = [];

    const getParent = () => broad || minor || major || total;

    for (var i = 1; i < data.length; i++) {
        var entry = data[i];

        if (entry.level === 'major') {
            minor = broad = detail = major = null;
            var parent = getParent();
            major = entry;
            entry.parent = parent;
            parent.children.push(entry);
        } else if (entry.level === 'minor') {
            broad = detail = minor = null;
            var parent = getParent();
            minor = entry;
            entry.parent = parent;
            parent.children.push(entry);
        } else if (entry.level === 'broad') {
            detail = broad = null;
            var parent = getParent();
            broad = entry;
            entry.parent = parent;
            parent.children.push(entry);
        } else if (entry.level === 'detail') {
            detail = null;
            var parent = getParent();
            detail = entry;
            entry.parent = parent;
            parent.children.push(entry);
        }
        if (entry.level !== 'detail') {
            entry.children = [];
        }
    }

    data = data.map(entry => {
        entry.occupation_slug = entry.occupation_title.toLowerCase().replace(/[^a-z]+/g, '-');
        return entry;
    });

    data = data.map(entry => {
        const parentSlugs = [];
        var t = entry;
        do  {
            parentSlugs.push({ slug: t.occupation_slug, title: t.occupation_title });
            t = t.parent;
        } while(t)
        entry.parents = parentSlugs;
        return entry;
    });

    // fs.writeFileSync('_data/jobstree.json', JSON.stringify(data.map(x => {
    //     delete x.parents;
    //     delete x.parent;
    //     delete x.occupation_code;
    //     delete x.employment;
    //     delete x.employment_rse;
    //     delete x.employment_per_jobs;
    //     delete x.median_hourly_wage;
    //     delete x.annual_mean_wage;
    //     delete x.mean_hourly_wage;
    //     delete x.mean_wage_rse;
    //     delete x.annual_mean_wage;

    //     return x;
    // }).filter(x => x.level === 'major'), null, 4));

    data = data.map(entry => {
        if (entry.parent) entry.parent = { title: entry.parent.occupation_title, slug: entry.parent.occupation_slug };
        if (entry.children) entry.children = entry.children.map(c => ({ title: c.occupation_title, slug: c.occupation_slug }));
        return entry;
    });

    fs.writeFileSync('_data/jobs.json', JSON.stringify(data, null, 4));

    data.forEach(job => {
        const slug = job.occupation_slug;
        const title = `How much money do "${job.occupation_title}" make?`;
        delete job.occupation_slug;
        job.slug = slug;
        job.title = title;
        job.description = `How much money do "${job.occupation_title}" make? The average pay for "${job.occupation_title}" is ${job.annual_mean_wage} annually. There is an estimate of ${job.employment} "${job.occupation_title}" employed in the united states alone.`
        fs.writeFileSync(`_jobs/${slug}.html`, `---
${yaml.stringify(job, null, 4)}---
`
        );
    });

    
});





