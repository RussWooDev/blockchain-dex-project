import React, { Component } from 'react';
import './App.css';
//import Web3 from "web3"
import Navbar from './Navbar'
import Content from './Content'
import { connect } from 'react-redux' // important. 
import {
  loadWeb3,
  loadAccount,
  loadToken,
  loadExchange
} from '../store/interactions'
import { contractsLoadedSelector } from '../store/selectors'

class App extends Component {
  // this is a react lifecycle method. 
  // It says that the component is ready to go. See in react documentation
  componentWillMount() {
    this.loadBlockchainData(this.props.dispatch)
  }

  // always remmeber that if using ganache, you need to ensure that you give permission 
  //to metamask to allow it to display. see notes
   async loadBlockchainData(dispatch) {
    const web3 = await loadWeb3(dispatch)
    const networkId = await web3.eth.net.getId()
    await loadAccount(web3, dispatch)
    const token = await loadToken(web3, networkId, dispatch)
    if(!token) {
      window.alert('Token smart contract not detected on the current network. Please select another network with Metamask.')
      return
    }
    const exchange = await loadExchange(web3, networkId, dispatch)
    if(!exchange) {
      window.alert('Exchange smart contract not detected on the current network. Please select another network with Metamask.')
      return
    }
  }


 
  render() {
    return (
      <div>
        <Navbar />
        <Content />
        { this.props.contractsLoaded ? <Content /> : <div className="content"></div> } 
      </div>
    );
  }
}

//this is import for using redux
function mapStateToProps(state) { // this will pass the state in?
  return {
    // TODO: Fill me in...
    contractsLoaded: contractsLoadedSelector(state)
  }
}

export default connect (mapStateToProps)(App);

//<Navbar/> this helps render the navbar file.
// watch L29 12:40 for an explaination how the whole extracting the account and using it on the
// {}evaluates JS within a markup


