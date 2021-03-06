import React, { Component } from 'react'
import TextField from 'material-ui/TextField'
import SelectField from 'material-ui/SelectField'
import MenuItem from 'material-ui/MenuItem'
import RaisedButton from 'material-ui/RaisedButton'
import mqttClient from 'mqtt'

const ConnectError = () => (
  <span style={{ marginTop: 12, color: 'red' }}>
    <i className="fas fa-exclamation-triangle" style={{ paddingRight: 5 }} />
    Could not connect to server.
  </span>
)

const protocols = ['MQTT', 'WebSocket']

class Settings extends Component {
  constructor(props) {
    super(props)
    this.state = {
      ipError: '',
      protocol: 1,
      ip: document.location.hostname,
      payload: '',
      limit: '10',
      connectError: false,
      qos: 0,
      wsPort: '8001',
      mqttPort: '8000',
    }
  }
  setIp = event =>
    this.setState({
      ip: event.target.value,
    })

  setPayload = event =>
    this.setState({
      payload: event.target.value,
    })

  setLimit = event =>
    this.setState({
      limit: event.target.value,
    })
  setWsPort = event =>
    this.setState({
      wsPort: event.target.value,
    })
  setMqttPort = event =>
    this.setState({
      mqttPort: event.target.value,
    })
  mqttPart = () => {
    const mqtt = mqttClient.connect(
      `mqtt://${this.state.ip}:${this.state.mqttPort}`,
    )
    let data = []
    let t0 = 0
    let count = 0

    mqtt.stream.on('error', e => {
      this.setState({
        connectError: true,
      })
      this.props.setValuesToResult([])
      mqtt.end()
    })

    mqtt.on('connect', () => {
      this.props.setLoading(true)
      this.setState({
        connectError: false,
      })
      mqtt.subscribe('/g', { qos: this.state.qos }, () => {
        mqtt.publish('/p', this.state.payload, () => {
          t0 = performance.now()
        })
      })
    })

    mqtt.on('message', (topic, message) => {
      if (count < this.state.limit && topic === '/g') {
        data.push(performance.now() - t0)
        mqtt.publish(
          '/p',
          this.state.payload,
          {
            qos: this.state.qos,
          },
          () => {
            t0 = performance.now()
          },
        )
        count++
      } else {
        this.props.setValuesToResult(data)
        mqtt.end()
        return false
      }
    })
  }
  wsPart = () => {
    if (this.ws) {
      this.ws.close()
    }
    this.ws = new WebSocket(`ws://${this.state.ip}:${this.state.wsPort}`)
    const ws = this.ws
    let data = []
    let t0 = 0
    let count = 0
    ws.onmessage = () => {
      if (count < this.state.limit) {
        data.push(performance.now() - t0)
        ws.send(this.state.payload)
        t0 = performance.now()
        count++
      } else {
        this.props.setValuesToResult(data)
        return false
      }
    }

    ws.onopen = () => {
      this.props.setLoading(true)
      this.setState({
        connectError: false,
      })
      ws.send(this.state.payload)
      t0 = performance.now()
    }

    ws.onerror = event => {
      this.setState({
        connectError: true,
      })
      this.props.setValuesToResult([])
    }
  }
  buttonOnClick = event => {
    event.stopPropagation()
    event.preventDefault()
    const protocolIndex = this.state.protocol
    const protocol = protocols[protocolIndex - 1]
    this.props.setPropsToResult({
      protocol,
      downloadLabel: `${protocol}-${
        protocolIndex === 1 ? `qos${this.state.qos}` : ''
      }-${this.state.limit}-${Date.now()}`,
    })
    if (this.state.ipError) return false
    if (this.state.limit <= 0) return this.props.setValuesToResult([])
    if (protocolIndex === 1) this.mqttPart()
    if (protocolIndex === 2) this.wsPart()
  }

  isRequired = event =>
    this.setState({
      ipError: event.target.value === '' ? 'This field is required' : '',
    })

  setProtocol = (event, index, protocol) => this.setState({ protocol })

  setQos = (event, index, qos) => this.setState({ qos })

  render() {
    return (
      <div style={{ display: 'grid' }}>
        <TextField
          hintText="Server IP"
          floatingLabelText="Server IP"
          type="text"
          errorText={this.state.ipError}
          onChange={this.isRequired}
          onBlur={this.setIp}
          defaultValue={this.state.ip}
        />
        <SelectField
          floatingLabelText="Protocol"
          value={this.state.protocol}
          onChange={this.setProtocol}
        >
          <MenuItem value={1} primaryText="MQTT" />
          <MenuItem value={2} primaryText="WebSocket" />
        </SelectField>
        {this.state.protocol === 1 && (
          <SelectField
            floatingLabelText="Quality of service"
            value={this.state.qos}
            onChange={this.setQos}
          >
            <MenuItem value={0} primaryText="Qos 0" />
            <MenuItem value={1} primaryText="Qos 1" />
          </SelectField>
        )}
        {this.state.protocol === 2 && (
          <TextField
            hintText="WebSocket Port"
            floatingLabelText="WebSocket Port"
            type="text"
            defaultValue={this.state.wsPort}
            onBlur={this.setWsPort}
          />
        )}
        {this.state.protocol === 1 && (
          <TextField
            hintText="MQTT port"
            floatingLabelText="MQTT port"
            type="text"
            defaultValue={this.state.mqttPort}
            onBlur={this.setMqttPort}
          />
        )}
        <TextField
          hintText="Payload"
          floatingLabelText="Payload"
          type="text"
          multiLine
          rowsMax={10}
          onBlur={this.setPayload}
        />
        <TextField
          hintText="Quantity of measures"
          floatingLabelText="Quantity of measures"
          type="text"
          onBlur={this.setLimit}
          defaultValue={this.state.limit}
        />
        <RaisedButton
          label="Start"
          primary
          style={{ width: 100, marginTop: 10 }}
          onClick={this.buttonOnClick}
        />
        {this.state.connectError && <ConnectError />}
      </div>
    )
  }
}
export default Settings
