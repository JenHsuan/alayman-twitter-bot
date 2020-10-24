const Twit = require('twit');
const Sequelize = require('sequelize');
const twitterConfig = require('./config')
const dbConfig = require('./database/config/config');
const db = require('./database/models');
const { ConnectionTimedOutError } = require('sequelize');
const { Post } = db;
const env = process.env.NODE_ENV || 'development';

//Connect to the database
const getConnectionString = env => {
    switch(env) {
        case 'development':
            return process.env.DEV_DATABASE_URL;
        case 'test':
            return process.env.TEST_DATABASE_URL;
        case 'production':
            return process.env.DATABASE_URL;
        default:
            return process.env.DEV_DATABASE_URL;    
    }
};
const sequelize = new Sequelize(getConnectionString(env));

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
     console.error('Unable to connect to the database:', err);
  });

//Init Twitter APIs
var T = new Twit(twitterConfig);

(async() => {
    //Retweet the posts which contain keywords
    await retweet();
    //Follow new subscribers
    await followNewSubScribers();
    //Send messages
    await sendMessages()  
}
)();


async function followNewSubScribers(){
    let res = await T.get('followers/list', { screen_name: 'ALayman-Daily Learning' });
    console.log(res.data)
    if (res.data) {
        await Promise.allSettled(
            res.data.users.map(async (item) => {
                let res = await T.post('friendships/create', { id: item.id_str });   
                console.log(res); 
            })
        );
    }
}

async function sendMessages(){
    const allPosts = await Post.findAll({
        order: [
            ['createdAt', 'DESC']
        ]
    });
    const posts = [allPosts[0], allPosts[1], allPosts[2]]
    const contents = [];
    let index = 1;
    await Promise.allSettled(posts.map(async post => {
        if (post.dataValues.tweetId) {
            console.log(post.dataValues.tweetId)
            let res = await T.get('statuses/show/:id', { id: post.dataValues.tweetId }) 
            contents.push(`${index}. ${res.data.user.name}:`)
            contents.push(res.data.text)
            contents.push('\n')
            index++;
        }
    }));

    console.log(contents)
    let res = await T.get('followers/list', { screen_name: 'ALayman-Daily Learning' });
    if (res.data) {
        await Promise.allSettled(
            res.data.users.map(async (item) => {
                await T.post('direct_messages/events/new', {
                    event: {
                      'type': 'message_create',
                      'message_create': {
                        'target': {
                          'recipient_id': item.id_str
                        },
                        'message_data': {
                          'text': contents.join('\n'),
                        }
                      }
                    }
                });
            }
        ));
    }
}

async function retweet() {
    const keywords = JSON.parse(process.env.TWITTER_KEYWORDS);
    await Promise.allSettled(keywords.map(async (keyword) => {
        var parameters = {
            q : keyword,
            result_type: 'recent',
            lang: 'en'
        }
        const res = await T.get('search/tweets', parameters);
        const tweets = res.data.statuses; 
        //console.log(res)
        if (tweets.length > 0){
            const retweetId = tweets[0].id_str;
            //console.log(retweetId)
            const query = tweets[0].user.name;
            const posts = await Post.findAll({
                where: {
                    tweetId: retweetId
                }
            });
            console.log(posts)
    
            if (posts.length === 0) {
                T.post('statuses/retweet/:id',{ id : retweetId }, tweeted);
                const newPost = await Post.create({
                    tweetId: retweetId,
                    query: query
                });
            }
        }
    }))
}