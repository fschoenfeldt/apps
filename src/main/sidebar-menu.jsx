// Kiebitz - Privacy-Friendly Appointments
// Copyright (C) 2021-2021 The Kiebitz Authors
// README.md contains license information.

import React from 'react';
import PropTypes from 'prop-types';
import { A } from 'components';
import classnames from 'classnames'
import './sidebar-menu.scss';

class NavItem extends React.Component {
    render() {
        const { href, onToggle } = this.props;
        return (
            <li className="kip-nav-item">
                <A href={href} onClick={onToggle}>
                    {this.props.children}
                </A>
            </li>
        );
    }
}

class DropdownItem extends React.Component {
    render() {
        const { href, onToggle } = this.props;
        return (
            <li className="kip-nav-item">
                <A href={href} onClick={onToggle}>
                    {this.props.children}
                </A>
            </li>
        );
    }
}

class DropdownMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
        };
        this.self = React.createRef();
    }

    isActive = () => {
        return this.state.active;
    };

    onToggle = event => {
        this.toggleActive();
        this.props.onToggle(event);
    };

    toggleActive = () => {
        this.setState({ active: !this.state.active });
    };

    render() {
        const { title, items, user } = this.props;
        const navItems = items
            .filter(item => {
                if (item.show !== undefined && item.show(user.user) === false)
                    return false;
                return true;
            })
            .map((item, i) => {
                let href;
                if (item.route !== undefined) href = '/' + item.route;
                return (
                    <DropdownItem
                        key={i}
                        href={href}
                        onToggle={e => this.props.onToggle(e)}
                    >
                        {item.title}
                    </DropdownItem>
                );
            });
        let subMenu;
        if (this.isActive()) {
            subMenu = <ul>{navItems}</ul>;
        }
        return (
            <li className="kip-nav-item" ref={this.self}>
                <A
                    className={this.isActive() ? 'is-active' : ''}
                    onClick={this.toggleActive}
                >
                    {title}
                </A>
                {subMenu}
            </li>
        );
    }
}

class MenuItems extends React.Component {
    render() {
        const { menu, onToggle, user } = this.props;
        const items = [];

        for (const [, item] of menu) {
            items.push(item);
        }

        return items
            .filter(item => {
                if (item.show !== undefined && item.show(user.user) === false)
                    return false;
                return true;
            })
            .map((item, i) => {
                if (item.subMenu !== undefined) {
                    return (
                        <DropdownMenu
                            key={i}
                            title={item.title}
                            items={item.subMenu}
                            onToggle={onToggle}
                        />
                    );
                } else {
                    let href;
                    if (item.route !== undefined) href = '/' + item.route;
                    return (
                        <NavItem key={i} href={href} onToggle={onToggle}>
                            {item.title}
                        </NavItem>
                    );
                }
            });
    }
}

const MenuItemsWithUser = MenuItems;

const Menu = ({ title, menu, onToggle, mobileOnly }) => (
    <aside
        className={classnames('kip-menu-aside', {
            'kip-mobile-only': mobileOnly,
        })}
    >
        {title && <p className="kip-menu-label">{title}</p>}
        <ul className="kip-menu-list">
            <MenuItemsWithUser menu={menu} onToggle={onToggle} />
        </ul>
    </aside>
);

Menu.propTypes = {
    title: PropTypes.node,
    onToggle: PropTypes.func,
};

export default Menu;
