//!
//! this code is taken from:
//! `https://github.com/sigoden/dufs/blob/main/src/main.rs`
//! its under Apache License & belongs to respective owners!!
//! `https://spdx.org/licenses/Apache-2.0.html`
//! credit: @sigoden
//!
use std::net::IpAddr;
use anyhow::{Context, Result};

use crate::cli::Args;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum BindAddr {
    IpAddr(IpAddr),
}

pub fn interface_addrs() -> Result<(Vec<BindAddr>, Vec<BindAddr>)> {
    let (mut ipv4_addrs, mut ipv6_addrs) = (vec![], vec![]);
    let ifaces = if_addrs::get_if_addrs().with_context(|| "Failed to get local interface addresses")?;
    for iface in ifaces.into_iter() {
        let ip = iface.ip();
        if ip.is_ipv4() {
            ipv4_addrs.push(BindAddr::IpAddr(ip))
        }
        if ip.is_ipv6() {
            ipv6_addrs.push(BindAddr::IpAddr(ip))
        }
    }
    Ok((ipv4_addrs, ipv6_addrs))
}

pub fn print_listening(args: &Args, print_addrs: &[BindAddr]) -> Result<String> {
    let mut output = String::new();
    let urls = print_addrs
        .iter()
        .map(|bind_addr| match bind_addr {
            BindAddr::IpAddr(addr) => {
                let addr = match addr {
                    IpAddr::V4(_) => format!("{}:{}", addr, args.port),
                    IpAddr::V6(_) => format!("[{}]:{}", addr, args.port),
                };
                let protocol = if args.ssl.clone().is_some() {
                    "https"
                } else {
                    "http"
                };
                format!("{}://{}", protocol, addr)
            }
        })
        .collect::<Vec<_>>();

    if urls.len() == 1 {
        output.push_str(&format!("Silly listening on: {}", urls[0]))
    } else {
        let info = urls
            .iter()
            .map(|v| format!("  {v}"))
            .collect::<Vec<String>>()
            .join("\n\t\t\t\t\t");
        output.push_str(&format!("Silly listening on:\n\n\t\t\t\t\t{info}\n"))
    }

    Ok(output)
}
