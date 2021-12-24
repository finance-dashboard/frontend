import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import useWebSocket from 'react-use-websocket'
import styled from 'styled-components'
import Row from 'react-bootstrap/Row'
import ListGroup from 'react-bootstrap/ListGroup'
import ToastContainer from 'react-bootstrap/ToastContainer'
import Toast from 'react-bootstrap/Toast'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import moment from 'moment/moment'
import axios from 'axios'

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
  time: string
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

type Levels = 'danger' | 'warning' | 'success'

type Message = {
  id: number
  level: Levels
  text: string
}

const PredictionForm = ({ show, asset, onHide }: { show: boolean; asset: Asset; onHide: () => void }) => {
  const [from, setFrom] = useState(moment(new Date()).subtract(30, 'days'))
  const [to, setTo] = useState(moment(new Date()))
  const [jobId, setJobId] = useState<string>('')
  const [predicted, setPredicted] = useState<number>()
  const [error, setError] = useState('')
  const [lockButtons, setLockButtons] = useState(false)

  const onChangeFrom = (e: ChangeEvent<HTMLInputElement>) => setFrom(moment(e.target.value))
  const onChangeTo = (e: ChangeEvent<HTMLInputElement>) => setTo(moment(e.target.value))

  const onPredict = () => {
    setJobId('')
    setPredicted(undefined)
    setError('')
    setLockButtons(true)

    const data = {
      start_date: from.toISOString(),
      end_date: to.toISOString(),
      code: asset.ticker
    }
    axios(`${process.env.REACT_APP_PREDICTION_SERVICE}/predict`, { method: 'POST', data, timeout: 3000 })
      .then(resp => {
        if (resp.status !== 202) {
          throw new Error(`Prediction service returned status ${resp.status}: ${resp.statusText}`)
        }

        const job = resp.data.job_id as string
        if (!job) {
          throw new Error("Prediction service didn't return job id")
        }

        setJobId(job)
      })
      .catch(e => {
        setError(e.toString())
      })
  }

  useEffect(() => {
    if (jobId) {
      const interval = setInterval(() => {
        setPredicted(undefined)
        setError('')

        axios(`${process.env.REACT_APP_PREDICTION_SERVICE}/check_status/${jobId}`, { timeout: 3000 })
          .then(resp => {
            const result = resp.data.result as number | undefined
            if (!result) {
              console.log('Prediction result not available')
              return
            }

            setPredicted(result)
          })
          .catch(e => {
            setError(e.toString())
          })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [jobId])

  useEffect(() => {
    if (error !== '' || predicted) {
      setJobId('')
      setLockButtons(false)
    }
  }, [error, predicted])

  const onClose = () => {
    setJobId('')
    setPredicted(undefined)
    setError('')
    setLockButtons(false)
    onHide()
  }

  const minDateString = () => moment(new Date()).subtract(1, 'year').format('yyyy-MM-DD')
  const maxDateString = () => moment(new Date()).format('yyyy-MM-DD')

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {asset.ticker}: {asset.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col>
              <Form.Group className='mb-3'>
                <Form.Label>From</Form.Label>
                <Form.Control
                  type='date'
                  value={from.format('yyyy-MM-DD')}
                  min={minDateString()}
                  max={maxDateString()}
                  onChange={onChangeFrom}
                />
              </Form.Group>
            </Col>

            <Col>
              <Form.Group className='mb-3'>
                <Form.Label>To</Form.Label>
                <Form.Control
                  type='date'
                  value={to.format('yyyy-MM-DD')}
                  min={minDateString()}
                  max={maxDateString()}
                  onChange={onChangeTo}
                />
              </Form.Group>
            </Col>
          </Row>

          {error !== '' && (
            <Alert variant='danger' className='mt-2'>
              Error occurred: {error}
            </Alert>
          )}

          {jobId !== '' && (
            <Alert variant='warning' className='mt-2'>
              Started job {jobId}
            </Alert>
          )}

          {predicted && (
            <Alert variant='success' className='mt-2'>
              Predicted cost: {predicted.toFixed(2)} {asset.cost.currency}
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button variant='primary' onClick={onPredict} disabled={lockButtons}>
          Predict
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

const AssetCard = ({ asset, style }: { asset: Asset; style: Levels }) => {
  const { time, name, ticker, cost } = asset
  const recalcMsAgo = () => new Date().valueOf() - new Date(time).valueOf()
  const [msAgo, setMsAgo] = useState(recalcMsAgo())

  useEffect(() => {
    const interval = setInterval(() => setMsAgo(recalcMsAgo()), 100)
    return () => clearTimeout(interval)
  })

  const [showDialog, setShowDialog] = useState(false)
  const onShowDialog = () => setShowDialog(true)
  const onCloseDialog = () => setShowDialog(false)
  return (
    <>
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

          <ListGroup.Item className='d-grid gap-2'>
            <Button variant='primary' size='sm' onClick={onShowDialog}>
              Predict
            </Button>
          </ListGroup.Item>
        </ListGroup>

        <Card.Footer>
          <Badge pill bg={style}>
            {(msAgo / 1000).toFixed(1)}s ago
          </Badge>
        </Card.Footer>
      </Card>

      <PredictionForm show={showDialog} asset={asset} onHide={onCloseDialog} />
    </>
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
  const [reconnectStopped, setReconnectStopped] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const { lastJsonMessage } = useWebSocket(url, {
    onOpen: () => {
      onError({ id: Math.random(), level: 'success', text: `Connected to ${provider.name}` })
      setReconnectStopped(false)
      setReconnectAttempts(0)
    },
    onClose: () => {
      onError({
        id: Math.random(),
        level: 'warning',
        text: `Connection to ${provider.name} was closed. Trying to reconnect`
      })
      setReconnectAttempts(reconnectAttempts + 1)
    },
    onReconnectStop: numAttempts => {
      if (!reconnectStopped) {
        onError({
          id: Math.random(),
          level: 'danger',
          text: `Tried to reconnect ${numAttempts} times. Won't repeat`
        })
      }
      setReconnectStopped(true)
    },
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    reconnectInterval: 10000,
    retryOnError: true
  })
  if (lastJsonMessage) {
    const asset = lastJsonMessage as Asset
    assets.current.set(asset.ticker, asset)
  }

  const status = reconnectAttempts === 0 ? 'success' : reconnectAttempts === 1 ? 'warning' : 'danger'
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
                <AssetCard asset={_} style={status} />
              </Col>
            ))}
        </Row>
      )}
    </Container>
  )
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
          <Toast key={_.id} onClose={() => closeToast(_)} show={true} delay={2000} autohide bg={_.level}>
            <Toast.Body>{_.text}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </Root>
  )
}
