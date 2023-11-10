const fs = require("fs");
const {parse} = require("csv-parse");
const MovieDB = require('node-themoviedb');

const tmdb_api_key = "FILL_WITH_YOUR_VALUE";

const mdb = new MovieDB(tmdb_api_key);

async function getEpisodesFromTvTimeCSV() {
    const rows = await new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream("./seen_episode.csv")
            .pipe(parse({delimiter: ",", from_line: 2}))
            .on("data", function (row) {
                const episode = {
                    episode_number: row[0],
                    episode_id: row[1],
                    created_at: new Date(row[2]),
                    episode_season_number: row[3],
                    show_name: row[5],
                    updatedAt: new Date(row[7])
                };
                data.push(episode);
            }).on('end', () => resolve(data))
    });

    return await rows;
}

async function getTvShowsFromTvTimeCSV() {
    const rows = await new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream("./followed_tv_show.csv")
            .pipe(parse({delimiter: ",", from_line: 2}))
            .on("data", function (row) {
                const tvShow = {
                    id: row[0],
                    createdAt: new Date(row[1]),
                    active: row[2] === "1",
                    name: row[5],
                    updatedAt: new Date(row[7]),
                    archived: row[10] === "1"
                };
                data.push(tvShow);
            }).on('end', () => resolve(data))
    });

    return await rows;
}

async function addMovieDbId(shows) {
    const showsWithMDBId = [];
    for (const show of shows) {
        let movieDbId = parseManuallyShows(show);

        if (movieDbId === 0) {
            const res = await mdb.search.TVShows({
                query: {
                    query: show.name
                }
            });

            let movieDbId = 0;
            if (res.data.results.length === 0) {
                console.error("Show not have custom id", show);
            } else {
                movieDbId = res.data.results[0].id;
            }
        }

        if (movieDbId > 0) {
            showsWithMDBId.push({movieDbId: movieDbId, ...show});
        }
    }
    return showsWithMDBId;
}

function parseManuallyShows(show) {
    switch (show.name) {
        case "The One That Looms":
            return 35338;
        case "Break Point (2023)":
            return 216386;
        case "Untold (2021)":
            return 0;
        case "Informe+":
            return 210761;
        case "The Challenge (2020)":
            return 194877;
        case "High Score (2020)":
            return 106754;
        case "Living Abroad":
            return 104505;
        case "Hyperdrive (2019)":
            return 91766;
        case "Luis, the sage of success":
            return 85242;
        case "Perfect Life (2019)":
            return 94734;
        case "Welcome to the Family (2018)":
            return 76567;
        case "Genius (2017)":
            return 70128;
        case "Mars (2016)":
            return 68427;
        case "All or Nothing: American Football":
            return 66943;
        case "The End of Comedy":
            return 71091;
        case "Top Chef (ES)":
            return 102851;
        case "Cosmos (2014)":
            return 58474;
        case "White Glove":
            return 71251;
        case "Archer (2009)":
            return 10283;
        case "Bad Living":
            return 39485;
        default:
            return 0;
    }
}

function generateEpisodeHistory(seen_episodes) {
    return seen_episodes.map(x => {
        return {
            progress: 100,
            show_episode_number: parseInt(x.episode_number),
            show_season_number: parseInt(x.episode_season_number),
            ended_on: x.updatedAt
        }
    });
}

function convertToRyotJson(shows) {
    const result = [];
    for (const s of shows) {
        result.push({
            collections: [],
            identifier: s.movieDbId.toString(),
            lot: "Show",
            reviews: [],
            seen_history: generateEpisodeHistory(s.seen_episodes),
            source: "Tmdb",
            source_id: s.movieDbId.toString()
        });
    }

    return result;
}

function addEpisodesToShows(shows, episodes) {
    return shows.map(s => {
        return {seen_episodes: episodes.filter(x => x.show_name === s.name), ...s};
    });
}

async function run() {
    const shows = await getTvShowsFromTvTimeCSV();
    const episodes = await getEpisodesFromTvTimeCSV();
    const showsWithMovieId = await addMovieDbId(shows);
    const showsWithEpisodes = addEpisodesToShows(showsWithMovieId, episodes);
    const theFinalJson = convertToRyotJson(showsWithEpisodes);

    fs.appendFileSync("./tvshows-ryot.json", JSON.stringify(theFinalJson));
}

run();
