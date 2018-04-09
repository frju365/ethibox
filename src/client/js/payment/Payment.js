import React, { Component } from 'react';
import { Dropdown, Message, Grid, Form, Header, Button } from 'semantic-ui-react';
import { isAlpha } from 'validator';
import { checkStatus } from '../utils';

class Purchase extends Component {
    state = { name: '', number: '', expMonth: '01', expYear: (new Date()).getFullYear(), cvc: '', errors: [], loading: false, success: false };

    componentDidMount() {
        Stripe.setPublishableKey('token.publishableKey');
    }

    handleChange = (e, { name, value }) => this.setState({ [name]: value, errors: [] })

    handleSubmit = () => {
        const { name, number, expMonth, expYear, cvc } = this.state;
        const errors = [];
        this.setState({ loading: true });

        if (!isAlpha(name.replace(/\s/g, ''))) {
            errors.push('Please enter your name');
        }

        if (number.replace(/\s/g, '').length !== 16) {
            errors.push('Please enter a correct card number');
        }

        if (cvc.length !== 3) {
            errors.push('Security Code must be 3 digts');
        }

        if (errors.length) {
            this.setState({ errors, success: false, loading: false });
        } else {
            Stripe.createToken({ name, number, expMonth, expYear, cvc }, (status, response) => {
                if (response.error) {
                    this.setState({ success: false, errors: [response.error.message], loading: false });
                    return;
                }

                fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-access-token': localStorage.getItem('token') },
                    body: JSON.stringify({ stripeToken: response.id }),
                })
                    .then(checkStatus)
                    .then(() => this.setState({ success: true, loading: false }))
                    .catch(({ message }) => {
                        this.setState({ success: false, errors: [message], loading: false });
                    });
            });
        }
    }

    render() {
        const { errors, loading, expMonth, expYear, success } = this.state;

        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(month => ({ text: month, value: month }));
        const years = [];
        const currentYear = (new Date()).getFullYear();
        for (let year = currentYear; year <= currentYear + 10; year += 1) {
            years.push({ text: year, value: year });
        }

        return (
            <Grid columns={2} stackable>
                <Grid.Column width={10}>
                    <Form>
                        <Header as="h1" content="Ethibox Premium" subheader="Payer un abonnement" />
                        <Message header="Success" content="Congratulation! You have a premium account" visible={success} success />
                        <Message header="Error" list={errors} visible={!!errors.length} error />
                        <Form.Input label="Full name" placeholder="John Doe" icon="users" iconPosition="left" name="name" onChange={this.handleChange} />
                        <Form.Input label="Card Number" placeholder="1111 2222 3333 4444" icon="credit card" iconPosition="left" name="number" onChange={this.handleChange} />
                        <Form.Group widths="equal">
                            <Form.Field>
                                <label>Month expiration</label>
                                <Dropdown name="expMonth" options={months} value={expMonth} onChange={this.handleChange} fluid selection />
                            </Form.Field>
                            <Form.Field>
                                <label>Year expiration</label>
                                <Dropdown name="expYear" options={years} value={expYear} onChange={this.handleChange} fluid selection />
                            </Form.Field>
                        </Form.Group>
                        <Form.Input label="Security Code" icon="lock" iconPosition="left" placeholder="123" name="cvc" onChange={this.handleChange} />
                        <p>You will be billed now and on the 1th of each month thereafter. You can cancel or change your subscription at any time.</p>
                        <Button onClick={this.handleSubmit} loading={loading} disabled={loading}>Pay 49€</Button>
                    </Form>
                </Grid.Column>
            </Grid>
        );
    }
}

export default Purchase;
