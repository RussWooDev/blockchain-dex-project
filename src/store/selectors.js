import { get } from 'lodash' // library that gives us nice fuinctions on js. "get" nested keys and provide a default value.
import { createSelector } from 'reselect'

//const shopItemsSelector = state => state.shop.items // reads state and fetch shop items
const account = state => get(state, "web3.account")
// the account is the argement that gets passed into the selector function
export const accountSelector = createSelector(account, account => account)

const tokenLoaded = state => get(state, 'token.loaded', false)
export const tokenLoadedSelector = createSelector(tokenLoaded, tl => tl)

const exchangeLoaded = state => get(state, 'exchange.loaded', false)
export const exchangeLoadedSelector = createSelector(exchangeLoaded, el => el)

const exchange = state => get(state, 'exchange.contract')
export const exchangeSelector = createSelector(exchange, e => e)

export const contractsLoadedSelector = createSelector(// this is important.
    tokenLoaded,
    exchangeLoaded,
    (tl, el) => (tl && el) // this sees if both are loaded 
)