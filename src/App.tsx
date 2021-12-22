import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import React, { useEffect, useRef, useState } from 'react'
import useWebSocket from 'react-use-websocket'
import styled from 'styled-components'
import moment from 'moment'
import Row from 'react-bootstrap/Row'
import ListGroup from 'react-bootstrap/ListGroup'
import ToastContainer from 'react-bootstrap/ToastContainer'
import Toast from 'react-bootstrap/Toast'
import Alert from 'react-bootstrap/Alert'

const H1 = styled.h1`
  margin: 0;
  padding: 0;
  font-size: 1.6em;
`

const H2 = styled.h2`
  margin: 0;
  padding: 0;
  font-size: 1.4em;
`

const Header = styled.header`
  color: #dcdcdc;
  background-color: #2570ff;
  padding: 0.5em 1em;
`

const Main = styled.main`
  flex: 1;
  padding: 1em;
`

const Root = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: stretch;
  height: 100vh;
`

type Asset = {
  time: Date
  name: string
  ticker: string
  cost: {
    low: number
    high: number
    currency: string
  }
}

type Provider = {
  name: string
  url: string
}

const AssetCard = ({ asset }: { asset: Asset }) => {
  const { time, name, ticker, cost } = asset
  return (
    <Card as={'article'} className='h-100'>
      <Card.Header>{ticker}</Card.Header>
      <Card.Body>
        <Card.Title>{name}</Card.Title>
      </Card.Body>
      <ListGroup variant='flush'>
        <ListGroup.Item className='text-success'>
          Buy: {cost.high.toFixed(2)} {cost.currency}
        </ListGroup.Item>
        <ListGroup.Item className='text-danger'>
          Sell: {cost.low.toFixed(2)} {cost.currency}
        </ListGroup.Item>
      </ListGroup>
      <Card.Footer>
        <div className='text-muted'>{moment(time).fromNow()}</div>
      </Card.Footer>
    </Card>
  )
}

const ProviderSection = ({
  provider,
  onError = () => ({})
}: {
  provider: Provider
  onError?: (message: Message) => void
}) => {
  const { name, url } = provider
  const assets = useRef(new Map<string, Asset>())

  const { lastJsonMessage } = useWebSocket(url, {
    onOpen: () => onError({ id: Math.random(), level: 'success', text: `Connected to ${provider.name}` }),
    onError: () => onError({ id: Math.random(), level: 'danger', text: `Error connecting to ${provider.name}` }),
    onClose: () =>
      onError({
        id: Math.random(),
        level: 'warning',
        text: `Connection to ${provider.name} was closed. Trying to reconnect`
      }),
    onReconnectStop: numAttempts =>
      onError({
        id: Math.random(),
        level: 'danger',
        text: `Tried to reconnect ${numAttempts} times. Won't repeat`
      }),
    shouldReconnect: () => true,
    reconnectAttempts: 20,
    reconnectInterval: 5000,
    retryOnError: true
  })
  if (lastJsonMessage) {
    const asset = lastJsonMessage as Asset
    assets.current.set(asset.ticker, asset)
  }

  return (
    <Container as={'article'} className='pt-2 pb-2'>
      <H2>{name}</H2>
      {assets.current.size === 0 ? (
        <Alert className='mt-2'>Loading assets...</Alert>
      ) : (
        <Row className='mt-2' xs={1} sm={2} md={4} lg={6} xl={12}>
          {Array.from(assets.current.values())
            .sort((a, b) => a.ticker.localeCompare(b.ticker))
            .map(_ => (
              <Col key={_.ticker} className='p-2'>
                <AssetCard asset={_} />
              </Col>
            ))}
        </Row>
      )}
    </Container>
  )
}

type Message = {
  id: number
  level: 'danger' | 'warning' | 'success'
  text: string
}

export const App = () => {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    document.title = 'Finance Dashboard'
  }, [])

  const providersEnv: string = process.env.REACT_APP_PROVIDERS ?? ''

  console.log('providers env var:', providersEnv)

  const providers: Provider[] = []
  for (const provider of providersEnv.split(';')) {
    const [name, url] = provider.split('=')
    providers.push({ name, url })
  }

  console.log('providers parsed:', JSON.stringify(providers))

  const closeToast = (message: Message) => {
    setMessages(messages.filter(e => e !== message))
  }
  const addToast = (message: Message) => {
    setMessages([...messages, message])
  }

  return (
    <Root>
      <Header>
        <H1>Finance Dashboard</H1>
      </Header>

      <Main>
        <Col>
          {providers.map(_ => (
            <ProviderSection key={_.name} provider={_} onError={addToast} />
          ))}
        </Col>
      </Main>

      <ToastContainer className='position-fixed end-0 bottom-0 p-2'>
        {messages.map(_ => (
          <Toast key={_.id} onClose={() => closeToast(_)} show={true} delay={3000} autohide bg={_.level}>
            <Toast.Body>{_.text}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </Root>
  )
}
