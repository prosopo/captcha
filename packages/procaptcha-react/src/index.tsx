import ReactDOM from 'react-dom'
import { Procaptcha } from './components/Procaptcha'

const config = {
    userAccountAddress: '',
    web2: true,
    dappName: 'Prosopo',
    network: {
        endpoint: 'ws://127.0.0.1:9944',
        prosopoContract: {
            address: '5FBqsaMfATm4sjJ4x3VLrejg6XHk9aE6pi93hxHDgUrNT6uS',
            name: 'prosopo',
        },
        dappContract: {
            address: '5CXBPMtA9FYKjTcGF1ZBHjEks5n1C14e2XbQeNGqSQ5Kgngm', //change to reCAPTCHA_site_key
            name: 'dapp',
        },
    },
    solutionThreshold: 80,
}

export function render() {
    ReactDOM.render(<Procaptcha config={config} />, document.getElementById('root')) //wrap in fn and give user access to func
}

//https://stackoverflow.com/questions/41174095/do-i-need-to-use-onload-to-start-my-webpack-bundled-code
export function ready(fn) {
    console.log(window.location.href)
    if (document.readyState != 'loading') {
        console.log('ready!')
        fn()
    } else {
        console.log('DOMContentLoaded listener!')
        // note sure if this is the correct event listener
        document.addEventListener('DOMContentLoaded', fn)
    }
}

ready(render)

{
    /* <script>
function onClick(e) {
  e.preventDefault();
  grecaptcha.ready(function() {
    grecaptcha.execute('reCAPTCHA_site_key', {action: 'submit'}).then(function(token) {
        // Add your logic to submit to your backend server here.
    });
  });
}
</script> */
}
// we want to just export our own ready and execute funcs, just use reCAPTCHA_site_key
// prosopo.exewcute/props/whatever
