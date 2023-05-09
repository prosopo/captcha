import ReactDOM from 'react-dom'
import { Procaptcha } from './components/Procaptcha'

const config = {
    userAccountAddress: '',
    web2: process.env.REACT_APP_WEB2 === 'true',
    dappName: 'Prosopo',
    network: {
        endpoint: 'ws://127.0.0.1:9944',
        prosopoContract: {
            address: '5FnxNv4GRpEmenypr1Scvh8gCGHjmYUT5Cz3nBWr8WU76AW6',
            name: 'prosopo',
        },
        dappContract: {
            address: '5HAbczrPszB9QVUaLtgEjkKEA6McNNSnqGmgSJbu5kQnUhMF', //change to reCAPTCHA_site_key
            name: 'dapp',
        },
    },
    solutionThreshold: 80,
}

ReactDOM.render(<Procaptcha config={config} />, document.getElementById('root')) //wrap in fn and give user access to func

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
